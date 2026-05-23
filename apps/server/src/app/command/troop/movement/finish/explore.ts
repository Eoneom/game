import { Factory } from '#adapter/factory'
import { createReturnBaseTrip } from '#app/command/troop/movement/shared'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'

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

    const updated_exploration = exploration.exploreCells(explored_cell_ids)

    const report = ReportFactory.generateUnread({
      type: ReportType.EXPLORATION,
      movement,
      troops,
      recorded_at: arrived_at,
    })

    const { base_movement, base_arrive_at } = await createReturnBaseTrip({
      inbound_movement: movement,
      troops,
      arrived_at,
      schedule: 'if_future',
    })

    await Promise.all([
      repository.exploration.updateOne(updated_exploration),
      repository.report.create(report),
    ])

    return { base_movement, base_arrive_at }
  })
}
