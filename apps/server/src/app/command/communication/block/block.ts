import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CommunicationService } from '#core/communication/service'
import { PlayerError } from '#core/player/error'
import { now } from '#shared/time'

interface BlockCommunicationPlayerParams {
  blocker_id: string
  player_name: string
}

/** Idempotent; the blocked player is not told. */
export async function blockCommunicationPlayer({
  blocker_id,
  player_name,
}: BlockCommunicationPlayerParams): Promise<{ blocked_id: string }> {
  return runCommand('communication:block:create', async () => {
    const repository = Factory.getRepository()

    const name = player_name.trim()
    if (!name) {
      throw new Error(PlayerError.NOT_FOUND)
    }
    const target = await repository.player.getByName(name)
    CommunicationService.assertBlockTarget({
      blocker_id,
      target
    })

    await repository.player_block.block({
      blocker_id,
      blocked_id: target.id,
      created_at: now()
    })

    return { blocked_id: target.id }
  })
}
