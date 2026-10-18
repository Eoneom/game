import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import type { SystemTickCategory } from '#core/player/system/tick-category'

export type SystemIntentScoringInput = {
  category: SystemTickCategory
  reason?: string
  priority: number
}

function categoryUtilityWeight(category: SystemTickCategory, snapshot: SystemEmpireSnapshot): number {
  switch (category) {
  case 'settle':
    return snapshot.can_found_city ? 120 : 40
  case 'make-permanent':
    return 90 + snapshot.temporary_outpost_count * 5
  case 'base':
    return snapshot.expansion_starved ? 100 : 70
  case 'explore':
    return snapshot.defer_explore || snapshot.frontier_queue_length > 0 ? 5 : 35
  case 'upgrade': {
    let score = snapshot.economy_first ? 85 : 45
    if (snapshot.city_warehouse_under_pressure) {
      score += 35
    }
    return score
  }
  case 'research':
    return snapshot.production_ready_for_research ? 80 : 40
  case 'deploy-outpost':
    return snapshot.needs_outpost_logistics ? 75 : 20
  case 'recruit':
    if (snapshot.empire_under_threat && !snapshot.combat_army_ready) {
      return 95
    }
    return snapshot.combat_army_ready ? 30 : 65
  case 'transport':
    return snapshot.outpost_transport_pressure_count * 12
  case 'attack':
    if (snapshot.empire_under_threat) {
      return 0
    }
    return snapshot.combat_army_ready ? 55 : 0
  default:
    return 0
  }
}

/** Lightweight 2-tick roll-forward on snapshot counters (deterministic, no I/O). */
export function rollForwardSystemEmpireSnapshot(
  snapshot: SystemEmpireSnapshot,
  category: SystemTickCategory,
): SystemEmpireSnapshot {
  switch (category) {
  case 'base':
    return {
      ...snapshot,
      temporary_outpost_count: snapshot.temporary_outpost_count + 1,
      expansion_starved: false,
      frontier_queue_length: Math.max(0, snapshot.frontier_queue_length - 1),
    }
  case 'settle':
    return {
      ...snapshot,
      temporary_outpost_count: Math.max(0, snapshot.temporary_outpost_count - 1),
      settle_ready_temp_count: Math.max(0, snapshot.settle_ready_temp_count - 1),
      can_found_city: false,
    }
  case 'make-permanent':
    return {
      ...snapshot,
      temporary_outpost_count: Math.max(0, snapshot.temporary_outpost_count - 1),
      permanent_outpost_count: snapshot.permanent_outpost_count + 1,
    }
  case 'deploy-outpost':
    return {
      ...snapshot,
      needs_outpost_logistics: snapshot.outpost_logistics_needs_gatherer_count > 1,
      outpost_logistics_needs_gatherer_count: Math.max(
        0,
        snapshot.outpost_logistics_needs_gatherer_count - 1,
      ),
    }
  case 'transport':
    return {
      ...snapshot,
      outpost_transport_pressure_count: Math.max(
        0,
        snapshot.outpost_transport_pressure_count - 1,
      ),
    }
  case 'recruit':
    return {
      ...snapshot,
      combat_army_ready: snapshot.combat_army_ready || snapshot.visible_enemy_combat_stacks > 0,
    }
  case 'attack':
    return {
      ...snapshot,
      visible_enemy_combat_stacks: Math.max(0, snapshot.visible_enemy_combat_stacks - 1),
    }
  default:
    return snapshot
  }
}

export function scoreSystemIntentUtility(
  intent: Pick<SystemIntentScoringInput, 'category' | 'reason'>,
  snapshot: SystemEmpireSnapshot,
): number {
  let score = categoryUtilityWeight(intent.category, snapshot)
  if (intent.reason === 'expansion_starved' || intent.reason === 'city_founding') {
    score += 25
  }
  if (intent.reason === 'outpost_logistics_needs_gatherer') {
    score += 20
  }
  if (intent.reason === 'outpost_logistics_needs_haul') {
    score += 15
  }
  const after_one = rollForwardSystemEmpireSnapshot(snapshot, intent.category)
  const after_two = rollForwardSystemEmpireSnapshot(after_one, intent.category)
  score += categoryUtilityWeight(intent.category, after_one) * 0.35
  score += categoryUtilityWeight(intent.category, after_two) * 0.15
  if (snapshot.frontier_queue_length > 0 && intent.category === 'explore') {
    score -= 50
  }
  return score
}

const STRUCTURAL_REASON_PREFIXES = [
  'commit_temp_outpost',
  'found_city_candidate',
  'expansion_starved',
  'city_founding',
  'outpost_logistics',
  'outpost_transport_pressure',
  'city_warehouse_pressure',
]

function isStructuralPrepend(intent: SystemIntentScoringInput): boolean {
  if (!intent.reason) {
    return false
  }
  return STRUCTURAL_REASON_PREFIXES.some(prefix => intent.reason?.startsWith(prefix))
}

/** Re-rank non-structural intents by lookahead utility (stable within equal scores). */
export function rerankIntentsByUtility<T extends SystemIntentScoringInput>(
  intents: T[],
  snapshot: SystemEmpireSnapshot,
): T[] {
  const structural: T[] = []
  const flexible: T[] = []
  for (const intent of intents) {
    if (isStructuralPrepend(intent)) {
      structural.push(intent)
    } else {
      flexible.push(intent)
    }
  }
  const ranked = [ ...flexible ].sort((left, right) => {
    const score_diff = scoreSystemIntentUtility(right, snapshot)
      - scoreSystemIntentUtility(left, snapshot)
    if (score_diff !== 0) {
      return score_diff
    }
    return left.priority - right.priority
  })
  return [
    ...structural,
    ...ranked.map((intent, index) => ({
      ...intent,
      priority: structural.length + index,
    })),
  ]
}
