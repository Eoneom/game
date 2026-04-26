import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'

export interface RebaseTroopMovementParams {
  player_id: string
  movement_id: string
}

export async function rebaseTroopMovement({
  movement_id,
  player_id,
}: RebaseTroopMovementParams): Promise<void> {
  return runCommand('troop:rebase', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.NOT_OWNER)
    }

    const troops = await repository.troop.listByMovement({ movement_id })

    const distance = WorldService.getDistance({
      origin: movement.destination,
      destination: movement.origin,
    })

    const rebase_movement = TroopService.createMovement({
      action: MovementAction.BASE,
      destination: movement.origin,
      distance,
      origin: movement.destination,
      player_id,
      start_at: movement.arrive_at,
      troops,
    })

    const rebase_troops = TroopService.assignToMovement({
      troops,
      movement_id: movement.id,
    })

    const report = ReportFactory.generateUnread({
      type: ReportType.REBASE,
      movement,
      troops,
    })

    await Promise.all([
      ...rebase_troops.map(t => repository.troop.updateOne(t)),
      repository.movement.delete(movement.id),
      repository.movement.create(rebase_movement),
      repository.report.create(report),
    ])
  })
}
