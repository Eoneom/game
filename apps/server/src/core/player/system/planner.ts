import {
  SYSTEM_EXPANSION_STARVED_MAX_BASE_PREPENDS,
  SYSTEM_MAX_ACTIONS_PER_TICK,
  SYSTEM_MAX_CITY_FOUNDING_BASE_PREPENDS,
  SYSTEM_MAX_OUTPOST_DEPLOY_PREPENDS,
  SYSTEM_MAX_OUTPOST_TRANSPORT_PREPENDS,
  SYSTEM_MAX_SETTLE_PREPENDS,
} from '#core/player/system/constants'
import {
  SYSTEM_TICK_ECONOMY_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'
import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import { rerankIntentsByUtility } from '#core/player/system/intent-utility'

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

function dedupeCategoriesKeepingFirst(
  categories: SystemTickCategory[],
): SystemTickCategory[] {
  const seen = new Set<SystemTickCategory>()
  const deduped: SystemTickCategory[] = []
  for (const category of categories) {
    if (seen.has(category)) {
      continue
    }
    seen.add(category)
    deduped.push(category)
  }
  return deduped
}

export function planSystemPlayerActions(
  snapshot: SystemEmpireSnapshot,
  tick_index: number,
): SystemPlayerActionIntent[] {
  const expansion_starved = snapshot.expansion_starved
  let categories = categoriesForTick(tick_index, {
    economy_first: snapshot.economy_first && !expansion_starved,
    expansion_categories: snapshot.expansion_categories,
  })
  if (snapshot.production_ready_for_research) {
    categories = prioritizeResearchBeforeUpgrade(categories)
  }
  if (snapshot.defer_explore) {
    categories = deprioritizeExploreInPlan(categories)
  }

  const intents: SystemPlayerActionIntent[] = []
  const seen_categories = new Set<SystemTickCategory>()

  if (snapshot.settle_ready_temp_count > 0) {
    const settle_attempts = Math.min(
      snapshot.settle_ready_temp_count,
      SYSTEM_MAX_SETTLE_PREPENDS,
      SYSTEM_MAX_ACTIONS_PER_TICK - intents.length,
    )
    for (let index = 0; index < settle_attempts; index += 1) {
      intents.push({
        category: 'settle',
        priority: intents.length,
        reason: 'found_city_candidate',
      })
    }
    seen_categories.add('settle')
  }

  if (snapshot.temporary_outpost_count > 0) {
    const remaining_budget = SYSTEM_MAX_ACTIONS_PER_TICK - intents.length
    const commit_attempts = Math.min(
      snapshot.temporary_outpost_count,
      remaining_budget,
    )
    for (let index = 0; index < commit_attempts; index += 1) {
      intents.push({
        category: 'make-permanent',
        priority: intents.length,
        reason: 'commit_temp_outpost',
      })
    }
    seen_categories.add('make-permanent')
  }

  if (
    !snapshot.outpost_limit_reached
    && snapshot.can_found_city
    && snapshot.settle_ready_temp_count === 0
    && snapshot.temporary_outpost_count === 0
  ) {
    const remaining_budget = SYSTEM_MAX_ACTIONS_PER_TICK - intents.length
    const founding_base_attempts = Math.min(
      SYSTEM_MAX_CITY_FOUNDING_BASE_PREPENDS,
      remaining_budget,
    )
    for (let index = 0; index < founding_base_attempts; index += 1) {
      intents.push({
        category: 'base',
        priority: intents.length,
        reason: 'city_founding',
      })
    }
    seen_categories.add('base')
  }

  if (expansion_starved && !snapshot.outpost_limit_reached) {
    const remaining_budget = SYSTEM_MAX_ACTIONS_PER_TICK - intents.length
    const base_attempts = Math.min(
      SYSTEM_EXPANSION_STARVED_MAX_BASE_PREPENDS,
      remaining_budget,
    )
    for (let index = 0; index < base_attempts; index += 1) {
      intents.push({
        category: 'base',
        priority: intents.length,
        reason: 'expansion_starved',
      })
    }
    seen_categories.add('base')
  }

  if (snapshot.needs_outpost_logistics) {
    const remaining_budget = SYSTEM_MAX_ACTIONS_PER_TICK - intents.length
    const deploy_attempts = Math.min(
      SYSTEM_MAX_OUTPOST_DEPLOY_PREPENDS,
      remaining_budget,
    )
    const logistics_reason = snapshot.outpost_logistics_needs_gatherer_count > 0
      ? 'outpost_logistics_needs_gatherer'
      : snapshot.outpost_logistics_needs_haul_count > 0
        ? 'outpost_logistics_needs_haul'
        : 'outpost_logistics'
    for (let index = 0; index < deploy_attempts; index += 1) {
      intents.push({
        category: 'deploy-outpost',
        priority: intents.length,
        reason: logistics_reason,
      })
    }
    seen_categories.add('deploy-outpost')
  }

  if (snapshot.outpost_transport_pressure_count > 0) {
    const remaining_budget = SYSTEM_MAX_ACTIONS_PER_TICK - intents.length
    const transport_attempts = Math.min(
      snapshot.outpost_transport_pressure_count,
      SYSTEM_MAX_OUTPOST_TRANSPORT_PREPENDS,
      remaining_budget,
    )
    for (let index = 0; index < transport_attempts; index += 1) {
      intents.push({
        category: 'transport',
        priority: intents.length,
        reason: 'outpost_transport_pressure',
      })
    }
    seen_categories.add('transport')
  }

  for (const category of dedupeCategoriesKeepingFirst(categories)) {
    if (category === 'base' && snapshot.outpost_limit_reached) {
      continue
    }
    if (seen_categories.has(category)) {
      continue
    }
    seen_categories.add(category)
    intents.push({
      category,
      priority: intents.length,
      ...(snapshot.defer_explore && category === 'explore'
        ? {
          reason: snapshot.frontier_queue_length > 0
            ? 'defer_explore_for_frontier'
            : 'defer_explore_for_basing',
        }
        : {}),
    })
  }

  if (snapshot.empire_under_threat && !seen_categories.has('recruit')) {
    intents.push({
      category: 'recruit',
      priority: intents.length,
      reason: 'defend_recruit',
    })
  }

  return rerankIntentsByUtility(intents, snapshot)
}
