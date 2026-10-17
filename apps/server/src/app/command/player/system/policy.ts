import {
  SYSTEM_TICK_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'

export { SYSTEM_TICK_CATEGORIES, type SystemTickCategory } from '#core/player/system/tick-category'

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

export type SystemPlayerTickResult = {
  category: SystemTickCategory
  payload: SystemTickActionPayload
}

export async function actForSystemPlayer({
  player_id,
  tick_index,
  actions,
}: {
  player_id: string
  tick_index: number
  actions: Record<SystemTickCategory, SystemTickAction>
}): Promise<SystemPlayerTickResult | null> {
  for (const category of categoriesForTick(tick_index)) {
    const payload = await actions[category](player_id)
    if (payload) {
      return {
        category,
        payload,
      }
    }
  }

  return null
}
