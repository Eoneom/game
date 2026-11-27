import assert from 'assert'
import { Factory } from '#adapter/factory'
import { createReturnBaseTrip } from '#app/command/troop/movement/shared'
import { AppService } from '#app/service'
import { runCommand } from '#command/run'
import { CityEntity } from '#core/city/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'

interface FinishExchangeMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

type FinishExchangeMovementResult =
  /** Cargo delivered (or brought back): the carriers head home with an automatic `base` movement. */
  | { kind: 'returning', base_movement: MovementEntity, base_arrive_at: number }
  /** The destination city changed hands: the convoy goes on to the recipient's closest city. */
  | { kind: 'redirected', movement: MovementEntity, arrive_at: number }

/**
 * Exchange convoy arrival (slice 035). The cargo is added to the recipient's city stock even above warehouse
 * capacity; when the destination city is no longer the recipient's, the convoy goes on to the recipient's closest
 * city, and when the recipient has no city left it turns back and the cargo returns to the sender with the
 * carriers. No report is written (the `trade` report already gave the arrival time).
 */
export async function finishExchangeMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishExchangeMovementParams): Promise<FinishExchangeMovementResult> {
  return runCommand('troop:finish:exchange', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const movement = await repository.movement.getById(movement_id)
    assert.strictEqual(movement.action, MovementAction.EXCHANGE)
    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const [
      troops,
      trade,
      destination_cell
    ] = await Promise.all([
      repository.troop.listByMovement({ movement_id }),
      movement.exchange_trade_id ? repository.exchange.findTradeParties(movement.exchange_trade_id) : Promise.resolve(null),
      repository.cell.getCell({ coordinates: movement.destination }),
    ])

    const is_seller_convoy = trade?.seller_player_id === player_id
    const recipient_player_id = trade ? (is_seller_convoy ? trade.buyer_player_id : trade.seller_player_id) : null
    const sender_city_id = trade ? (is_seller_convoy ? trade.seller_city_id : trade.buyer_city_id) : null
    const home = await resolveHome({
      sender_city_id,
      fallback: movement.origin
    })

    const destination_city = await repository.city.searchByCell({ cell_id: destination_cell.id })
    if (recipient_player_id && destination_city?.isOwnedBy(recipient_player_id)) {
      const stock = await repository.resource_stock.getByCellId({ cell_id: destination_cell.id })
      // The buyer paid for it: delivered even above warehouse capacity (gathering then pauses, slice 035).
      await repository.resource_stock.updateOne(stock.refund({ resource: movement.resources }))
      const {
        base_movement, base_arrive_at 
      } = await createReturnBaseTrip({
        inbound_movement: movement,
        troops,
        arrived_at,
        schedule: 'if_future',
        home,
      })
      return {
        kind: 'returning',
        base_movement,
        base_arrive_at
      }
    }

    const next_city = recipient_player_id
      ? await findClosestCity({
        player_id: recipient_player_id,
        from: movement.destination
      })
      : null

    if (!next_city) {
      // Nobody to deliver to: the carriers bring the cargo back to the sender.
      const {
        base_movement, base_arrive_at 
      } = await createReturnBaseTrip({
        inbound_movement: movement,
        troops,
        arrived_at,
        resources: movement.resources,
        schedule: 'if_future',
        home,
      })
      return {
        kind: 'returning',
        base_movement,
        base_arrive_at
      }
    }

    // Redirected convoy leg: carriers only, so the faction logistics speed bonus applies (slice 039).
    const logistics = await AppService.getLogisticsModifier({ player_id })
    const {
      movement: next_movement, arrive_at 
    } = TroopService.createMovement({
      troops,
      start_at: arrived_at,
      distance: WorldService.getDistance({
        origin: movement.destination,
        destination: next_city.coordinates
      }),
      origin: movement.destination,
      destination: next_city.coordinates,
      player_id,
      action: MovementAction.EXCHANGE,
      resources: movement.resources,
      exchange_trade_id: movement.exchange_trade_id,
      non_combat_speed_multiplier: logistics.non_combat_speed,
    })
    await repository.movement.create(next_movement)
    await Promise.all([
      repository.movement.delete(movement.id),
      ...TroopService.assignToMovement({
        troops,
        movement_id: next_movement.id
      }).map(troop => repository.troop.updateOne(troop)),
    ])
    await job_queue.scheduleTroopMovementFinish({
      player_id,
      movement_id: next_movement.id,
      execute_at: arrive_at,
    })
    return {
      kind: 'redirected',
      movement: next_movement,
      arrive_at
    }
  })
}

/** The carriers go back to their order city (a redirected convoy no longer starts from it). */
async function resolveHome({
  sender_city_id,
  fallback
}: {
  sender_city_id: string | null
  fallback: Coordinates
}): Promise<Coordinates> {
  if (!sender_city_id) {
    return fallback
  }
  const repository = Factory.getRepository()
  const city = await repository.city.get(sender_city_id)
  const cell = await repository.cell.getById(city.cell_id)
  return cell.coordinates
}

async function findClosestCity({
  player_id,
  from
}: {
  player_id: string
  from: Coordinates
}): Promise<{ city: CityEntity, coordinates: Coordinates } | null> {
  const repository = Factory.getRepository()
  const cities = await repository.city.list({ player_id })
  const located = await Promise.all(cities.map(async city => ({
    city,
    coordinates: (await repository.cell.getById(city.cell_id)).coordinates,
  })))
  const sorted = located.sort((a, b) => WorldService.getDistance({
    origin: from,
    destination: a.coordinates
  }) - WorldService.getDistance({
    origin: from,
    destination: b.coordinates
  }) || a.city.id.localeCompare(b.city.id))
  return sorted[0] ?? null
}
