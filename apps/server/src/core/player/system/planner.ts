import {
  SYSTEM_TICK_ECONOMY_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'
import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'

export type SystemPlayerActionIntent = {
  category: SystemTickCategory
  priority: number
  reason?: string
}

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

export function prioritizeResearchBeforeUpgrade(
  categories: SystemTickCategory[],
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

export function deprioritizeExploreInPlan(
  categories: SystemTickCategory[],
): SystemTickCategory[] {
  const explore_index = categories.indexOf('explore')
  if (explore_index === -1) {
    return categories
  }
  const without_explore = categories.filter(category => category !== 'explore')
  const last_expansion_index = without_explore.findLastIndex(
    category => category === 'base'
      || category === 'settle'
      || category === 'make-permanent',
  )
  const insert_at = last_expansion_index === -1 ? 0 : last_expansion_index + 1
  return [
    ...without_explore.slice(0, insert_at),
    'explore',
    ...without_explore.slice(insert_at),
  ]
}

export function planSystemPlayerActions(
  snapshot: SystemEmpireSnapshot,
  tick_index: number,
): SystemPlayerActionIntent[] {
  let categories = categoriesForTick(tick_index, {
    economy_first: snapshot.economy_first,
    expansion_categories: snapshot.expansion_categories,
  })
  if (snapshot.production_ready_for_research) {
    categories = prioritizeResearchBeforeUpgrade(categories)
  }
  if (snapshot.defer_explore) {
    categories = deprioritizeExploreInPlan(categories)
  }

  return categories.map((category, priority) => ({
    category,
    priority,
    ...(snapshot.defer_explore && category === 'explore'
      ? { reason: 'defer_explore_for_basing' }
      : {}),
  }))
}
