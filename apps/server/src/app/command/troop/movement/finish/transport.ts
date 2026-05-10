import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  AppService,
  UNLIMITED_RESOURCE_CAPACITY
} from '#app/service'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'
import assert from 'assert'

export interface FinishTroopTransportMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

export interface FinishTroopTransportMovementResult {
  base_movement: MovementEntity
  base_arrive_at: number
}

export async function finishTroopTransportMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishTroopTransportMovementParams): Promise<FinishTroopTransportMovementResult> {
  return runCommand('troop:finish:transport', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const movement = await repository.movement.getById(movement_id)

    assert.strictEqual(movement.action, MovementAction.TRANSPORT)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const troops = await repository.troop.listByMovement({ movement_id })
    const destination_cell = await repository.cell.getCell({ coordinates: movement.destination })

    let remaining: Resource = { ...movement.resources }
    let deposited: Resource = {
      plastic: 0,
      mushroom: 0,
    }

    const city = destination_cell.city_id
      ? await repository.city.get(destination_cell.city_id)
      : null
    const outpost = await repository.outpost.searchByCell({ cell_id: destination_cell.id })

    const owned_city = city?.isOwnedBy(player_id) ? city : null
    const owned_outpost = outpost?.isOwnedBy(player_id) ? outpost : null

    if (owned_city || owned_outpost) {
      const stock = await repository.resource_stock.getByCellId({ cell_id: destination_cell.id })
      const warehouses_capacity = owned_city
        ? await AppService.getCityWarehousesCapacity({ city_id: owned_city.id })
        : UNLIMITED_RESOURCE_CAPACITY

      const {
        stock: updated_stock,
        deposited: deposited_cargo,
        remaining: leftover,
      } = stock.depositUpToCapacity({
        resource: movement.resources,
        warehouses_capacity,
      })

      deposited = deposited_cargo
      remaining = leftover
      await repository.resource_stock.updateOne(updated_stock)
    }

    const distance = WorldService.getDistance({
      origin: movement.destination,
      destination: movement.origin,
    })

    const { movement: base_movement, arrive_at: base_arrive_at } = TroopService.createMovement({
      troops,
      start_at: arrived_at,
      distance,
      origin: movement.destination,
      destination: movement.origin,
      player_id,
      action: MovementAction.BASE,
      resources: remaining,
    })

    const base_troops = TroopService.assignToMovement({
      troops,
      movement_id: base_movement.id,
    })

    const report = ReportFactory.generateUnread({
      type: ReportType.TRANSPORT,
      movement,
      troops,
      recorded_at: arrived_at,
      resources: deposited,
      remaining_resources: remaining,
    })

    await repository.movement.create(base_movement)

    await Promise.all([
      repository.movement.delete(movement.id),
      ...base_troops.map(troop => repository.troop.updateOne(troop)),
      repository.report.create(report),
    ])

    if (base_arrive_at > now()) {
      await job_queue.scheduleTroopMovementFinish({
        player_id,
        movement_id: base_movement.id,
        execute_at: base_arrive_at,
      })
    }

    return { base_movement, base_arrive_at }
  })
}
