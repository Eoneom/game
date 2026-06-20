import { Factory } from '#adapter/factory'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { actForSystemPlayer } from '#command/player/system/policy'
import { systemTickActions } from '#command/player/system/actions'
import { now } from '#shared/time'

export async function tickSystemPlayers({ tick_index }: { tick_index: number }): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const logger = Factory.getTickLogger('app:command:player:system:tick')
  const tick_at = now()

  const players = await repository.player.listSystemControlled()
  for (const player of players) {
    try {
      const category = await actForSystemPlayer({
        player_id: player.id,
        tick_index,
        actions: systemTickActions
      })
      logger.info('system player tick', {
        player_id: player.id,
        tick_index,
        category
      })
    } catch (err) {
      logger.error('system player tick failed', {
        player_id: player.id,
        tick_index,
        err
      })
    }
  }

  await job_queue.scheduleSystemPlayerTick({
    execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
    tick_index: tick_index + 1
  })
}
