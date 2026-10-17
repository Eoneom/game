import { systemTickExpansionCategories } from '#core/player/system/expansion-cell'
import {
  SYSTEM_TICK_CATEGORIES,
  SYSTEM_TICK_ECONOMY_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'

export { systemTickExpansionCategories } from '#core/player/system/expansion-cell'
import type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export { SYSTEM_TICK_CATEGORIES, type SystemTickCategory } from '#core/player/system/tick-category'
export type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export function categoriesForTick(
  tick_index: number,
  {
    economy_first = false,
    expansion_categories = SYSTEM_TICK_EXPANSION_CATEGORIES,
  }: {
    economy_first?: boolean
    expansion_categories?: readonly SystemTickCategory[]
  } = {},
): SystemTickCategory[] {
  const ring: SystemTickCategory[] = economy_first
    ? [
      ...SYSTEM_TICK_ECONOMY_CATEGORIES,
      ...expansion_categories,
    ]
    : [
      ...expansion_categories,
      ...SYSTEM_TICK_ECONOMY_CATEGORIES,
    ]
  const count = ring.length
  const start = ((tick_index % count) + count) % count
  return [
    ...ring.slice(start),
    ...ring.slice(0, start),
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

export function prioritizeResearchBeforeUpgrade(
  categories: SystemTickCategory[]
): SystemTickCategory[] {
  const upgrade_index = categories.indexOf('upgrade')
  const research_index = categories.indexOf('research')
  if (upgrade_index === -1 || research_index === -1 || research_index <= upgrade_index) {
    return categories
  }

  const prioritized = [ ...categories ]
  prioritized[upgrade_index] = 'research'
  prioritized[research_index] = 'upgrade'
  return prioritized
}

export async function actForSystemPlayer({
  player_id,
  tick_index,
  actions,
  categories,
}: {
  player_id: string
  tick_index: number
  actions: Record<SystemTickCategory, SystemTickAction>
  categories?: SystemTickCategory[]
}): Promise<SystemPlayerTickResult> {
  const attempts: SystemPlayerTickAttempt[] = []
  const category_order = categories ?? categoriesForTick(tick_index)

  for (const category of category_order) {
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
