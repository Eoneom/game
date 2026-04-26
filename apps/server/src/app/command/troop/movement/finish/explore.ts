import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'

export interface FinishTroopExploreMovementParams {
  player_id: string
  movement_id: string
}

export interface FinishTroopExploreMovementResult {
  base_movement: MovementEntity
}

export async function finishTroopExploreMovement({
  player_id,
  movement_id,
}: FinishTroopExploreMovementParams): Promise<FinishTroopExploreMovementResult> {
  return runCommand('troop:finish:explore', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    if (!movement.isArrived()) {
      throw new Error(TroopError.MOVEMENT_NOT_ARRIVED)
    }

    const [
      troops,
      exploration,
      explored_cell_ids
    ] = await Promise.all([
      repository.troop.listByMovement({ movement_id }),
      repository.exploration.get({ player_id }),
      AppService.getExploredCellIds({ coordinates: movement.destination }),
    ])

    const distance = WorldService.getDistance({
      origin: movement.destination,
      destination: movement.origin,
    })

    const base_movement = TroopService.createMovement({
      troops,
      start_at: movement.arrive_at,
      distance,
      origin: movement.destination,
      destination: movement.origin,
      player_id,
      action: MovementAction.BASE,
    })

    const base_troops = TroopService.assignToMovement({
      troops,
      movement_id: base_movement.id,
    })

    const updated_exploration = exploration.exploreCells(explored_cell_ids)

    const report = ReportFactory.generateUnread({
      type: ReportType.EXPLORATION,
      movement,
      troops,
    })

    await Promise.all([
      repository.movement.delete(movement.id),
      repository.movement.create(base_movement),
      ...base_troops.map(troop => repository.troop.updateOne(troop)),
      repository.exploration.updateOne(updated_exploration),
      repository.report.create(report),
    ])

    return { base_movement }
  })
}
