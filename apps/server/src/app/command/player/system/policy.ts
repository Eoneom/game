import {
  SYSTEM_TICK_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'
import type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export { SYSTEM_TICK_CATEGORIES, type SystemTickCategory } from '#core/player/system/tick-category'
export type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export function categoriesForTick(tick_index: number): SystemTickCategory[] {
  const count = SYSTEM_TICK_CATEGORIES.length
  const start = ((tick_index % count) + count) % count
  return [
    ...SYSTEM_TICK_CATEGORIES.slice(start),
    ...SYSTEM_TICK_CATEGORIES.slice(0, start),
  ]
}

export type SystemTickActionPayload = Record<string, unknown>

export type SystemTickAction = (player_id: string) => Promise<SystemTickActionPayload | null>

export type SystemPlayerTickResult =
  | {
      outcome: 'success'
      category: SystemTickCategory
      payload: SystemTickActionPayload
      attempts: SystemPlayerTickAttempt[]
    }
  | {
      outcome: 'idle'
      attempts: SystemPlayerTickAttempt[]
    }

export async function actForSystemPlayer({
  player_id,
  tick_index,
  actions,
}: {
  player_id: string
  tick_index: number
  actions: Record<SystemTickCategory, SystemTickAction>
}): Promise<SystemPlayerTickResult> {
  const attempts: SystemPlayerTickAttempt[] = []

  for (const category of categoriesForTick(tick_index)) {
    const payload = await actions[category](player_id)
    if (payload) {
      attempts.push({
        category,
        result: 'success',
      })
      return {
        outcome: 'success',
        category,
        payload,
        attempts,
      }
    }
    attempts.push({
      category,
      result: 'skipped',
    })
  }

  return {
    outcome: 'idle',
    attempts,
  }
}
