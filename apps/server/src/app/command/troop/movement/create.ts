import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppEvent } from '#core/events'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import { now } from '#shared/time'

export interface CreateTroopMovementParams {
  player_id: string
  origin: Coordinates
  destination: Coordinates
  action: MovementAction
  move_troops: TroopCount[]
}

export interface CreateTroopMovementResult {
  deleted_outpost_id?: string
}

export async function createTroopMovement({
  player_id,
  action,
  origin,
  destination,
  move_troops,
}: CreateTroopMovementParams): Promise<CreateTroopMovementResult> {
  return runCommand('troop:move', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const origin_cell = await repository.cell.getCell({ coordinates: origin })

    const origin_troops = await repository.troop.listInCell({
      cell_id: origin_cell.id,
      player_id,
    })

    const have_enough_troops = TroopService.haveEnoughTroops({
      origin_troops,
      move_troops,
    })
    if (!have_enough_troops) {
      throw new Error(TroopError.NOT_ENOUGH_TROOPS)
    }

    const distance = WorldService.getDistance({
      origin,
      destination,
    })

    const {
      updated_origin_troops,
      split_troops,
    } = TroopService.splitTroops({
      origin_troops: origin_troops,
      troops_to_split: move_troops,
    })

    const { movement, arrive_at } = TroopService.createMovement({
      player_id,
      origin,
      destination,
      action,
      distance,
      troops: split_troops,
      start_at: now(),
    })

    const movement_troops = TroopService.assignToMovement({
      troops: split_troops,
      movement_id: movement.id,
    })

    let save: {
      troops_to_create: TroopEntity[]
      movement_to_create: MovementEntity
    } & ({
      type: 'update'
      troops_to_update: TroopEntity[]
    } | {
      type: 'delete'
      outpost_to_delete: OutpostEntity
      troops_to_delete: TroopEntity[]
    })

    const outpost = await repository.outpost.searchByCell({ cell_id: origin_cell.id })

    if (outpost?.type === OutpostType.TEMPORARY && TroopService.areTroopsEmpty({ troops: updated_origin_troops })) {
      save = {
        type: 'delete',
        troops_to_create: movement_troops,
        movement_to_create: movement,
        outpost_to_delete: outpost,
        troops_to_delete: updated_origin_troops,
      }
    } else {
      save = {
        type: 'update',
        troops_to_update: updated_origin_troops,
        troops_to_create: movement_troops,
        movement_to_create: movement,
      }
    }

    const promises: Promise<void | string>[] = [
      ...save.troops_to_create.map(troop => repository.troop.create(troop)),
      repository.movement.create(save.movement_to_create),
    ]

    let deleted_outpost_id: string | undefined = undefined

    switch (save.type) {
    case 'update':
      promises.push(...save.troops_to_update.map(troop => repository.troop.updateOne(troop)))
      break

    case 'delete':
      promises.push(repository.outpost.delete(save.outpost_to_delete.id))
      promises.push(...save.troops_to_delete.map(troop => repository.troop.delete(troop.id)))
      deleted_outpost_id = save.outpost_to_delete.id
    }

    await Promise.all(promises)

    await job_queue.scheduleTroopMovementFinish({
      player_id,
      movement_id: movement.id,
      execute_at: arrive_at,
    })

    if (deleted_outpost_id) {
      Factory.getEventBus().emit(AppEvent.OutpostDeleted, {
        player_id,
        outpost_id: deleted_outpost_id
      })
    }

    return { deleted_outpost_id }
  })
}
