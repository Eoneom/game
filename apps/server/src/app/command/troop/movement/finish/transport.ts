import { Factory } from '#adapter/factory'
import {
  createReturnBaseTrip,
  resolveOwnedDepositTarget
} from '#app/command/troop/movement/shared'
import { runCommand } from '#command/run'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { Resource } from '#shared/resource'
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

    const deposit_target = await resolveOwnedDepositTarget({
      destination_cell,
      player_id,
    })

    if (deposit_target) {
      const stock = await repository.resource_stock.getByCellId({ cell_id: deposit_target.cell_id })
      const {
        stock: updated_stock,
        deposited: deposited_cargo,
        remaining: leftover,
      } = stock.depositUpToCapacity({
        resource: movement.resources,
        warehouses_capacity: deposit_target.warehouses_capacity,
      })

      deposited = deposited_cargo
      remaining = leftover
      await repository.resource_stock.updateOne(updated_stock)
    }

    const report = ReportFactory.generateUnread({
      type: ReportType.TRANSPORT,
      movement,
      troops,
      recorded_at: arrived_at,
      resources: deposited,
      remaining_resources: remaining,
    })

    const { base_movement, base_arrive_at } = await createReturnBaseTrip({
      inbound_movement: movement,
      troops,
      arrived_at,
      resources: remaining,
      schedule: 'if_future',
    })

    await repository.report.create(report)

    return { base_movement, base_arrive_at }
  })
}
