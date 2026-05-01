import assert from 'assert'
import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostService } from '#core/outpost/service'
import { OutpostError } from '#core/outpost/error'
import { id } from '#shared/identification'

export interface FinishTroopBaseMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

export interface FinishTroopBaseMovementResult {
  is_outpost_created: boolean
}

interface FinishBaseSave {
  delete_movement_id: string
  updated_troops: TroopEntity[]
  delete_troop_ids: string[]
  report: ReportEntity
  outpost?: OutpostEntity
}

function finishBaseMovementInLocation({
  movement,
  movement_troops,
  destination_cell_id,
  existing_destination_troops,
  arrived_at,
}: {
  movement: MovementEntity
  movement_troops: TroopEntity[]
  existing_destination_troops: TroopEntity[]
  destination_cell_id: string
  arrived_at: number
}): FinishBaseSave {
  const updated_troops = TroopService.mergeTroopsInCell({
    movement_troops,
    destination_troops: existing_destination_troops,
    cell_id: destination_cell_id,
  })

  const report = ReportFactory.generateUnread({
    type: ReportType.BASE,
    movement,
    troops: movement_troops,
    recorded_at: arrived_at,
  })

  return {
    delete_movement_id: movement.id,
    delete_troop_ids: movement_troops.map(troop => troop.id),
    updated_troops,
    report,
  }
}

function finishBaseMovementInTemporaryOutpost({
  destination_cell_id,
  movement,
  existing_outposts_count,
  player_id,
  movement_troops,
  arrived_at,
}: {
  destination_cell_id: string
  movement: MovementEntity
  existing_outposts_count: number
  player_id: string
  movement_troops: TroopEntity[]
  arrived_at: number
}): FinishBaseSave {
  const is_limit_reached = OutpostService.isLimitReached({ existing_outposts_count })
  if (is_limit_reached) {
    throw new Error(OutpostError.LIMIT_REACHED)
  }

  const destination_troops = TroopService.init({
    player_id,
    cell_id: destination_cell_id,
  })

  const updated_troops = TroopService.mergeTroopsInCell({
    movement_troops,
    destination_troops,
    cell_id: destination_cell_id,
  })

  const report = ReportFactory.generateUnread({
    type: ReportType.BASE,
    movement,
    troops: movement_troops,
    recorded_at: arrived_at,
  })

  const outpost = OutpostEntity.create({
    id: id(),
    player_id,
    cell_id: destination_cell_id,
    type: OutpostType.TEMPORARY,
  })

  return {
    delete_movement_id: movement.id,
    delete_troop_ids: movement_troops.map(troop => troop.id),
    updated_troops,
    report,
    outpost,
  }
}

export async function finishTroopBaseMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishTroopBaseMovementParams): Promise<FinishTroopBaseMovementResult> {
  return runCommand('troop:finish:base', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)

    assert.strictEqual(movement.action, MovementAction.BASE)

    if (movement.player_id !== player_id) {
      throw new Error(TroopError.NOT_OWNER)
    }

    const destination_cell = await repository.cell.getCell({ coordinates: movement.destination })

    const city_exists = Boolean(destination_cell.city_id)
    const outpost_exists = await repository.outpost.existsOnCell({ cell_id: destination_cell.id })
    const does_location_exist = city_exists || outpost_exists

    let finish_save: FinishBaseSave
    if (does_location_exist) {
      const [
        movement_troops,
        existing_destination_troops
      ] = await Promise.all([
        repository.troop.listByMovement({ movement_id }),
        repository.troop.listInCell({
          cell_id: destination_cell.id,
          player_id,
        }),
      ])
      finish_save = finishBaseMovementInLocation({
        movement,
        movement_troops,
        destination_cell_id: destination_cell.id,
        existing_destination_troops,
        arrived_at,
      })
    } else {
      const [
        movement_troops,
        existing_outposts_count
      ] = await Promise.all([
        repository.troop.listByMovement({ movement_id }),
        repository.outpost.countForPlayer({ player_id }),
      ])
      finish_save = finishBaseMovementInTemporaryOutpost({
        destination_cell_id: destination_cell.id,
        movement,
        existing_outposts_count,
        movement_troops,
        player_id,
        arrived_at,
      })
    }

    const save_promises: Promise<unknown>[] = [
      repository.report.create(finish_save.report),
      repository.movement.delete(finish_save.delete_movement_id),
      ...finish_save.updated_troops.map(troop => repository.troop.updateOne(troop, { upsert: true })),
      ...finish_save.delete_troop_ids.map(troop_id => repository.troop.delete(troop_id)),
    ]
    if (finish_save.outpost) {
      save_promises.push(
        repository.outpost.create(finish_save.outpost),
        repository.resource_stock.ensureWorldStockForCell({ cell_id: finish_save.outpost.cell_id }),
      )
    }
    await Promise.all(save_promises)

    return { is_outpost_created: Boolean(finish_save.outpost) }
  })
}
