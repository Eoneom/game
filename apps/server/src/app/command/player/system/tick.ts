import { Factory } from '#adapter/factory'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { collectSystemEmpireSnapshot } from '#app/query/player/system/empire-snapshot'
import {
  actForSystemPlayer,
  SYSTEM_MAX_ACTIONS_PER_TICK,
} from '#command/player/system/policy'
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
      const snapshot = await collectSystemEmpireSnapshot(player.id)
      const result = await actForSystemPlayer({
        player_id: player.id,
        tick_index,
        actions: systemTickActions,
        snapshot,
        max_actions: SYSTEM_MAX_ACTIONS_PER_TICK,
      })
      logger.info('system player tick', {
        player_id: player.id,
        tick_index,
        outcome: result.outcome,
        committed_count: result.outcome === 'idle'
          ? 0
          : result.committed_actions.length,
      })
      if (result.outcome === 'idle') {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: 'idle',
          attempts: result.attempts,
        })
      } else {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: result.outcome,
          attempts: result.attempts,
          committed_actions: result.committed_actions,
          category: result.category,
          payload: result.payload,
        })
        const stats = await collectSystemPlayerStatsSnapshot({
          player_id: player.id,
          player_name: player.name,
        })
        emitSystemPlayerStatsUpdated(stats)
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
