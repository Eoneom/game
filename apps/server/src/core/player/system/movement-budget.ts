import { SystemAiProfileId } from '#core/player/system/ai-profile'
import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import type { SystemTickCategory } from '#core/player/system/tick-category'

/** Consecutive saturated ticks before the planner raises the command center rank. */
export const SYSTEM_COMMAND_CENTER_SATURATION_TICKS = 3

/** Tick categories whose action creates a movement and so consumes one slot of the cap (slice 028). */
const SYSTEM_MOVEMENT_CATEGORIES: ReadonlySet<SystemTickCategory> = new Set<SystemTickCategory>([
  'explore',
  'base',
  'deploy-outpost',
  'transport',
  'attack',
])

function isSystemMovementCategory(category: SystemTickCategory): boolean {
  return SYSTEM_MOVEMENT_CATEGORIES.has(category)
}

export function systemMovementSlotsRemaining(snapshot: Pick<SystemEmpireSnapshot, 'movement_used' | 'movement_limit'>): number {
  return Math.max(0, snapshot.movement_limit - snapshot.movement_used)
}

/** At or one short of the cap: the empire is short on movements this tick. */
export function isSystemMovementSaturated(snapshot: Pick<SystemEmpireSnapshot, 'movement_used' | 'movement_limit'>): boolean {
  return snapshot.movement_used >= snapshot.movement_limit - 1
}

export function nextSystemMovementSaturatedTicks({
  previous_ticks,
  saturated,
}: {
  previous_ticks: number
  saturated: boolean
}): number {
  return saturated ? previous_ticks + 1 : 0
}

/** Raise `command_center` in the upgrade order once the cap has been tight for several ticks. */
export function shouldPrioritizeSystemCommandCenter(snapshot: Pick<SystemEmpireSnapshot, 'memory'>): boolean {
  return snapshot.memory.movement_saturated_ticks >= SYSTEM_COMMAND_CENTER_SATURATION_TICKS
}

/**
 * Lower is spent first when slots are scarce: Ash Liturgy attacks and pressured outpost transports,
 * then expansion (`base` / `deploy-outpost`), then other attacks and transports, then `explore`.
 */
function scarceMovementTier(
  intent: { category: SystemTickCategory, reason?: string },
  snapshot: Pick<SystemEmpireSnapshot, 'ai_profile' | 'outpost_transport_pressure_count'>,
): number {
  switch (intent.category) {
  case 'attack':
    return snapshot.ai_profile.id === SystemAiProfileId.ASH_LITURGY_AGGRESSIVE ? 0 : 2
  case 'transport':
    return snapshot.outpost_transport_pressure_count > 0 ? 0 : 2
  case 'base':
  case 'deploy-outpost':
    return 1
  case 'explore':
    return 3
  default:
    return 4
  }
}

/**
 * When fewer slots remain than movement intents, reorder the movement intents among their own
 * positions so the most valuable ones get the remaining slots. Other intents keep their place.
 */
export function prioritizeScarceMovementIntents<T extends { category: SystemTickCategory, priority: number, reason?: string }>(
  intents: T[],
  snapshot: Pick<SystemEmpireSnapshot, 'movement_used' | 'movement_limit' | 'ai_profile' | 'outpost_transport_pressure_count'>,
): T[] {
  const movement_positions: number[] = []
  const movement_intents: T[] = []
  intents.forEach((intent, index) => {
    if (isSystemMovementCategory(intent.category)) {
      movement_positions.push(index)
      movement_intents.push(intent)
    }
  })
  if (movement_intents.length <= systemMovementSlotsRemaining(snapshot)) {
    return intents
  }

  const sorted = movement_intents
    .map((intent, order) => ({
      intent,
      order
    }))
    .sort((left, right) => {
      const tier_difference = scarceMovementTier(left.intent, snapshot) - scarceMovementTier(right.intent, snapshot)
      return tier_difference !== 0 ? tier_difference : left.order - right.order
    })
    .map(({ intent }) => intent)

  const result = [ ...intents ]
  movement_positions.forEach((position, index) => {
    result[position] = sorted[index]
  })
  return result.map((intent, index) => ({
    ...intent,
    priority: index,
  }))
}
