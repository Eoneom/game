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
import { now } from '#shared/time'

export interface FinishTroopExploreMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

export interface FinishTroopExploreMovementResult {
  base_movement: MovementEntity
  base_arrive_at: number
}

export async function finishTroopExploreMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishTroopExploreMovementParams): Promise<FinishTroopExploreMovementResult> {
  return runCommand('troop:finish:explore', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const movement = await repository.movement.getById(movement_id)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
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

    const { movement: base_movement, arrive_at: base_arrive_at } = TroopService.createMovement({
      troops,
      start_at: arrived_at,
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
      recorded_at: arrived_at,
    })

    await repository.movement.create(base_movement)

    await Promise.all([
      repository.movement.delete(movement.id),
      ...base_troops.map(troop => repository.troop.updateOne(troop)),
      repository.exploration.updateOne(updated_exploration),
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
