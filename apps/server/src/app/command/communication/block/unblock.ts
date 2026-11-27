import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'

interface UnblockCommunicationPlayerParams {
  blocker_id: string
  blocked_id: string
}

/** Idempotent. */
export async function unblockCommunicationPlayer({
  blocker_id,
  blocked_id,
}: UnblockCommunicationPlayerParams): Promise<void> {
  return runCommand('communication:block:delete', async () => {
    await Factory.getRepository().player_block.unblock({
      blocker_id,
      blocked_id
    })
  })
}
