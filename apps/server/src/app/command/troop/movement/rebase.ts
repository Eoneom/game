import { Factory } from '#adapter/factory'
import { createReturnBaseTrip } from '#app/command/troop/movement/shared'
import { runCommand } from '#command/run'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { TroopError } from '#core/troop/error'

export interface RebaseTroopMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

export async function rebaseTroopMovement({
  movement_id,
  player_id,
  arrived_at,
}: RebaseTroopMovementParams): Promise<void> {
  return runCommand('troop:rebase', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const troops = await repository.troop.listByMovement({ movement_id })

    const report = ReportFactory.generateUnread({
      type: ReportType.REBASE,
      movement,
      troops,
      recorded_at: arrived_at,
    })

    await createReturnBaseTrip({
      inbound_movement: movement,
      troops,
      arrived_at,
      schedule: 'always',
    })

    await repository.report.create(report)
  })
}
