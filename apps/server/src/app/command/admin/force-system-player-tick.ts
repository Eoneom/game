import { Factory } from '#adapter/factory'
import { tickSystemPlayers } from '#command/player/system/tick'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { now } from '#shared/time'

export type ForceSystemPlayerTickResult = {
  tick_index: number
  next_tick_index: number
  next_execute_at: number
  system_player_count: number
}

export async function forceSystemPlayerTick(): Promise<ForceSystemPlayerTickResult> {
  const job_queue = Factory.getJobQueue()
  const repository = Factory.getRepository()

  const pending = await job_queue.getPendingSystemPlayerTick()
  const tick_index = pending?.tick_index ?? 0
  const players = await repository.player.listSystemControlled()

  await tickSystemPlayers({ tick_index })

  const next_pending = await job_queue.getPendingSystemPlayerTick()
  const tick_at = now()

  return {
    tick_index,
    system_player_count: players.length,
    next_tick_index: next_pending?.tick_index ?? tick_index + 1,
    next_execute_at: next_pending?.execute_at ?? tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
  }
}
