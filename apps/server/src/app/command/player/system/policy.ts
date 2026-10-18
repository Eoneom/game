import { systemTickExpansionCategories } from '#core/player/system/expansion-cell'
import { SYSTEM_MAX_ACTIONS_PER_TICK } from '#core/player/system/constants'
import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import {
  categoriesForTick,
  planSystemPlayerActions,
  prioritizeResearchBeforeUpgrade,
  type SystemPlayerActionIntent,
} from '#core/player/system/planner'
import {
  SYSTEM_TICK_CATEGORIES,
  SYSTEM_TICK_ECONOMY_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  type SystemTickCategory,
} from '#core/player/system/tick-category'

export { systemTickExpansionCategories } from '#core/player/system/expansion-cell'
export {
  SYSTEM_MAX_ACTIONS_PER_TICK,
} from '#core/player/system/constants'
export {
  categoriesForTick,
  planSystemPlayerActions,
  prioritizeResearchBeforeUpgrade,
  type SystemPlayerActionIntent,
} from '#core/player/system/planner'
import type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export { SYSTEM_TICK_CATEGORIES, type SystemTickCategory } from '#core/player/system/tick-category'
export type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'

export type SystemTickActionPayload = Record<string, unknown>

export type SystemTickAction = (player_id: string) => Promise<SystemTickActionPayload | null>

export type SystemPlayerTickCommittedAction = {
  category: SystemTickCategory
  payload: SystemTickActionPayload
}

export type SystemPlayerTickOutcome = 'success' | 'partial' | 'idle' | 'error'

export type SystemPlayerTickResult =
  | {
      outcome: 'success' | 'partial'
      committed_actions: SystemPlayerTickCommittedAction[]
      attempts: SystemPlayerTickAttempt[]
      /** @deprecated First committed action — use committed_actions */
      category: SystemTickCategory
      /** @deprecated First committed payload — use committed_actions */
      payload: SystemTickActionPayload
    }
  | {
      outcome: 'idle'
      attempts: SystemPlayerTickAttempt[]
    }

export { SYSTEM_TICK_ECONOMY_CATEGORIES, SYSTEM_TICK_EXPANSION_CATEGORIES }

export async function executeSystemPlayerTick({
  player_id,
  plan,
  actions,
  max_actions = SYSTEM_MAX_ACTIONS_PER_TICK,
}: {
  player_id: string
  plan: SystemPlayerActionIntent[]
  actions: Record<SystemTickCategory, SystemTickAction>
  max_actions?: number
}): Promise<SystemPlayerTickResult> {
  const attempts: SystemPlayerTickAttempt[] = []
  const committed_actions: SystemPlayerTickCommittedAction[] = []

  for (const intent of plan) {
    if (committed_actions.length >= max_actions) {
      break
    }

    const payload = await actions[intent.category](player_id)
    if (payload) {
      attempts.push({
        category: intent.category,
        result: 'success',
      })
      committed_actions.push({
        category: intent.category,
        payload,
      })
      continue
    }

    attempts.push({
      category: intent.category,
      result: 'skipped',
    })
  }

  if (committed_actions.length === 0) {
    return {
      outcome: 'idle',
      attempts,
    }
  }

  const outcome = committed_actions.length === 1 ? 'success' : 'partial'
  const first = committed_actions[0]
  return {
    outcome,
    committed_actions,
    attempts,
    category: first.category,
    payload: first.payload,
  }
}

export async function actForSystemPlayer({
  player_id,
  tick_index,
  actions,
  categories,
  snapshot,
  max_actions = 1,
}: {
  player_id: string
  tick_index: number
  actions: Record<SystemTickCategory, SystemTickAction>
  categories?: SystemTickCategory[]
  snapshot?: SystemEmpireSnapshot
  max_actions?: number
}): Promise<SystemPlayerTickResult> {
  const plan: SystemPlayerActionIntent[] = categories
    ? categories.map((category, priority) => ({
      category,
      priority,
    }))
    : snapshot
      ? planSystemPlayerActions(snapshot, tick_index)
      : planSystemPlayerActions({
        player_id,
        temporary_outpost_count: 0,
        expansion_categories: SYSTEM_TICK_EXPANSION_CATEGORIES,
        economy_first: false,
        production_ready_for_research: false,
        defer_explore: false,
        combat_army_ready: false,
      }, tick_index)

  return executeSystemPlayerTick({
    player_id,
    plan,
    actions,
    max_actions,
  })
}
