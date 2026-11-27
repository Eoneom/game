import assert from 'assert'
import { Factory } from '#adapter/factory'
import { resolveReinforceTarget } from '#app/command/troop/movement/reinforce-target'
import { createReturnBaseTrip } from '#app/command/troop/movement/shared'
import { runCommand } from '#command/run'
import { AllianceError } from '#core/alliance/error'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { id } from '#shared/identification'

interface FinishTroopReinforceMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

type FinishTroopReinforceMovementResult =
  | {
    outcome: 'stationed'
    host_player_id: string
    city_id: string
    report_id: string
  }
  | {
    outcome: 'returned'
    base_movement: MovementEntity
    base_arrive_at: number
  }

/**
 * `reinforce` arrival (slice 033): troops are stationed on the allied city cell with their owner's
 * `player_id` and the host gets a `reinforcement` report. When the city is no longer an allied city,
 * the troops come back automatically (no movement cap check).
 */
export async function finishTroopReinforceMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishTroopReinforceMovementParams): Promise<FinishTroopReinforceMovementResult> {
  return runCommand('troop:finish:reinforce', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)
    assert.strictEqual(movement.action, MovementAction.REINFORCE)
    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const movement_troops = await repository.troop.listByMovement({ movement_id })

    let target: Awaited<ReturnType<typeof resolveReinforceTarget>> | null = null
    try {
      target = await resolveReinforceTarget({
        player_id,
        destination: movement.destination,
      })
    } catch (err) {
      if ((err as Error).message !== AllianceError.INVALID_REINFORCE_TARGET) {
        throw err
      }
    }

    if (!target) {
      const {
        base_movement,
        base_arrive_at
      } = await createReturnBaseTrip({
        inbound_movement: movement,
        troops: movement_troops,
        arrived_at,
        schedule: 'if_future',
      })
      return {
        outcome: 'returned',
        base_movement,
        base_arrive_at,
      }
    }

    // Merge into the owner's own stacks on the host cell only, never the host's.
    const owner_troops_on_cell = await repository.troop.listInCell({
      cell_id: target.destination_cell_id,
      player_id,
    })
    const stationed = TroopService.mergeTroopsInCell({
      movement_troops,
      destination_troops: owner_troops_on_cell,
      cell_id: target.destination_cell_id,
    })

    const host_report = ReportEntity.create({
      id: id(),
      type: ReportType.REINFORCEMENT,
      was_read: false,
      player_id: target.host_player_id,
      troops: movement_troops.map(troop => ({
        code: troop.code,
        count: troop.count,
      })),
      recorded_at: arrived_at,
      origin: movement.origin,
      destination: movement.destination,
    })

    await Promise.all([
      repository.movement.delete(movement.id),
      ...stationed.map(troop => repository.troop.updateOne(troop, { upsert: true })),
      ...movement_troops
        .filter(troop => !stationed.some(stationed_troop => stationed_troop.id === troop.id))
        .map(troop => repository.troop.delete(troop.id)),
    ])
    await repository.report.createReinforcementReport({
      report: host_report,
      owner_player_id: player_id,
    })

    return {
      outcome: 'stationed',
      host_player_id: target.host_player_id,
      city_id: target.city_id,
      report_id: host_report.id,
    }
  })
}
