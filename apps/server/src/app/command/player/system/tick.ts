import { Factory } from '#adapter/factory'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { actForSystemPlayer } from '#command/player/system/policy'
import { systemTickActions } from '#command/player/system/actions'
import { emitSystemPlayerTickObservability } from '#command/player/system/emit-observability'
import { emitSystemPlayerStatsUpdated } from '#command/player/system/emit-stats'
import { collectSystemPlayerStatsSnapshot } from '#app/query/admin/system-player-stats'
import { now } from '#shared/time'

export async function tickSystemPlayers({ tick_index }: { tick_index: number }): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const logger = Factory.getTickLogger('app:command:player:system:tick')
  const tick_at = now()

  const players = await repository.player.listSystemControlled()
  for (const player of players) {
    try {
      const result = await actForSystemPlayer({
        player_id: player.id,
        tick_index,
        actions: systemTickActions
      })
      logger.info('system player tick', {
        player_id: player.id,
        tick_index,
        outcome: result.outcome,
        category: result.outcome === 'success' ? result.category : null,
      })
      if (result.outcome === 'success') {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: 'success',
          attempts: result.attempts,
          category: result.category,
          payload: result.payload,
        })
        const stats = await collectSystemPlayerStatsSnapshot({
          player_id: player.id,
          player_name: player.name,
        })
        emitSystemPlayerStatsUpdated(stats)
      } else {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: 'idle',
          attempts: result.attempts,
        })
      }
    } catch (err) {
      logger.error('system player tick failed', {
        player_id: player.id,
        tick_index,
        err
      })
      emitSystemPlayerTickObservability({
        player_id: player.id,
        player_name: player.name,
        tick_index,
        committed_at: tick_at,
        outcome: 'error',
        attempts: [],
        error: err,
      })
    }
  }

  await job_queue.scheduleSystemPlayerTick({
    execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
    tick_index: tick_index + 1
  })
}
