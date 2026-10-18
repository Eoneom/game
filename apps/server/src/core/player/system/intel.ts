import type { Coordinates } from '#core/world/value/coordinates'

export type SystemEmpireIntelSettlement = {
  coordinates: Coordinates
  kind: 'city' | 'outpost'
  player_id: string
  is_human: boolean
}

export type SystemEmpireIntelThreat = {
  coordinates: Coordinates
  combat_stack_count: number
  distance_to_nearest_owned: number
}

export type SystemEmpireIntel = {
  nearest_threat_distance: number | null
  visible_enemy_combat_stacks: number
  opponent_settlement_count: number
  settlements: SystemEmpireIntelSettlement[]
  threats: SystemEmpireIntelThreat[]
}

export const EMPTY_SYSTEM_EMPIRE_INTEL: SystemEmpireIntel = {
  nearest_threat_distance: null,
  visible_enemy_combat_stacks: 0,
  opponent_settlement_count: 0,
  settlements: [],
  threats: [],
}

export function isEmpireUnderThreat(
  intel: SystemEmpireIntel,
  max_threat_distance = 6,
): boolean {
  if (intel.nearest_threat_distance === null) {
    return false
  }
  return intel.nearest_threat_distance <= max_threat_distance
}

function manhattanDistance(left: Coordinates, right: Coordinates): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

export function minDistanceToOwned({
  point,
  owned_coordinates,
}: {
  point: Coordinates
  owned_coordinates: Coordinates[]
}): number | null {
  if (owned_coordinates.length === 0) {
    return null
  }
  return owned_coordinates.reduce((best, owned) => {
    const distance = manhattanDistance(point, owned)
    return Math.min(best, distance)
  }, Number.POSITIVE_INFINITY)
}
