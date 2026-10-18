import type { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  SYSTEM_BASE_MIN_CHEBYSHEV_FROM_SETTLEMENT,
  SYSTEM_BASE_ORIGIN_DISTANCE_MIN_MANHATTAN,
  SYSTEM_BASE_ORIGIN_DISTANCE_PEAK_MANHATTAN,
  SYSTEM_BASE_ORIGIN_DISTANCE_SOFT_MAX_MANHATTAN,
} from '#core/player/system/constants'
import {
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES_COMMIT_FIRST,
  type SystemTickCategory,
} from '#core/player/system/tick-category'
import { isCoordinatesBlocked } from '#core/player/system/memory'

type ScoredCell = Pick<CellEntity, 'coordinates' | 'resource_coefficient' | 'solar_coefficient'>

/** Weight solar slightly above raw resources when choosing explore targets. */
export function systemExpansionScoutScore(cell: ScoredCell): number {
  const resource_total = cell.resource_coefficient.plastic + cell.resource_coefficient.mushroom
  return cell.solar_coefficient * 1.25 + resource_total
}

export function systemExpansionOutpostResourceScore(cell: ScoredCell): number {
  return cell.resource_coefficient.plastic + cell.resource_coefficient.mushroom
}

export function systemExpansionCitySiteScore(cell: ScoredCell): number {
  return cell.solar_coefficient
}

function compareCoordinates(left: Coordinates, right: Coordinates): number {
  if (left.x !== right.x) {
    return left.x - right.x
  }
  return left.y - right.y
}

function sameCoordinates(left: Coordinates, right: Coordinates): boolean {
  return left.x === right.x && left.y === right.y
}

export function chebyshevGridDistance(left: Coordinates, right: Coordinates): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y))
}

export function manhattanGridDistance(left: Coordinates, right: Coordinates): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

export function isSystemBaseCellTooCloseToSettlement(
  candidate: Coordinates,
  settlement_coordinates: readonly Coordinates[],
): boolean {
  for (const settlement of settlement_coordinates) {
    if (chebyshevGridDistance(candidate, settlement) < SYSTEM_BASE_MIN_CHEBYSHEV_FROM_SETTLEMENT) {
      return true
    }
  }
  return false
}

/**
 * Triangular preference: ramp up from min, peak at ideal, taper through soft max, then decay.
 */
export function systemExpansionBaseOriginDistanceFactor(
  candidate: Coordinates,
  founding_city: Coordinates,
): number {
  const distance = manhattanGridDistance(candidate, founding_city)
  const min_distance = SYSTEM_BASE_ORIGIN_DISTANCE_MIN_MANHATTAN
  const peak_distance = SYSTEM_BASE_ORIGIN_DISTANCE_PEAK_MANHATTAN
  const soft_max_distance = SYSTEM_BASE_ORIGIN_DISTANCE_SOFT_MAX_MANHATTAN

  if (distance < min_distance) {
    return 0.35 + 0.35 * (distance / min_distance)
  }
  if (distance <= peak_distance) {
    const span = peak_distance - min_distance
    const progress = span === 0 ? 1 : (distance - min_distance) / span
    return 0.7 + 0.3 * progress
  }
  if (distance <= soft_max_distance) {
    const span = soft_max_distance - peak_distance
    const progress = span === 0 ? 0 : (distance - peak_distance) / span
    return 1 - 0.45 * progress
  }
  const excess = distance - soft_max_distance
  return Math.max(0.25, 0.55 - excess * 0.03)
}

export function isSystemBaseCellCandidate({
  cell,
  explored,
  occupied_cell_ids,
  origin_coordinates,
  settlement_coordinates,
  blocked_coordinates = [],
}: {
  cell: Pick<CellEntity, 'id' | 'coordinates'>
  explored: boolean
  occupied_cell_ids: Set<string>
  origin_coordinates: Coordinates
  settlement_coordinates: readonly Coordinates[]
  blocked_coordinates?: readonly Coordinates[]
}): boolean {
  if (!explored) {
    return false
  }
  if (occupied_cell_ids.has(cell.id)) {
    return false
  }
  if (sameCoordinates(cell.coordinates, origin_coordinates)) {
    return false
  }
  if (isCoordinatesBlocked(cell.coordinates, blocked_coordinates)) {
    return false
  }
  if (isSystemBaseCellTooCloseToSettlement(cell.coordinates, settlement_coordinates)) {
    return false
  }
  return true
}

export function sortCellsByExpansionScore<T extends ScoredCell>({
  cells,
  score,
}: {
  cells: T[]
  score: (cell: T) => number
}): T[] {
  return [ ...cells ].sort((left, right) => {
    const score_delta = score(right) - score(left)
    if (score_delta !== 0) {
      return score_delta
    }
    return compareCoordinates(left.coordinates, right.coordinates)
  })
}

export function systemExpansionBaseCellScore({
  can_found_city,
  founding_city_coordinates = null,
}: {
  can_found_city: boolean
  founding_city_coordinates?: Coordinates | null
}): (cell: ScoredCell) => number {
  const resource_score = can_found_city
    ? systemExpansionCitySiteScore
    : systemExpansionOutpostResourceScore
  if (!founding_city_coordinates) {
    return resource_score
  }
  return (cell) => {
    const resource = resource_score(cell)
    const distance_factor = systemExpansionBaseOriginDistanceFactor(
      cell.coordinates,
      founding_city_coordinates,
    )
    return resource * distance_factor
  }
}

export function systemExpansionMinBaseScore({
  can_found_city,
}: {
  can_found_city: boolean
}): number {
  return can_found_city ? 1.5 : 2
}

/**
 * Skip explore when a viable explored base site exists — commit known high-value
 * cells before scouting for marginally better fog.
 */
export function shouldDeferExploreForBasing({
  best_base_score,
  best_unexplored_scout_score,
  can_found_city,
}: {
  best_base_score: number | null
  best_unexplored_scout_score: number | null
  can_found_city: boolean
}): boolean {
  if (best_base_score === null) {
    return false
  }
  const min_base_score = systemExpansionMinBaseScore({ can_found_city })
  if (best_base_score < min_base_score) {
    return false
  }
  if (best_unexplored_scout_score === null) {
    return true
  }
  return best_base_score >= best_unexplored_scout_score * 0.75
}

/** Resource-driven expansion ring; commit temps before further scouting when needed. */
export function systemTickExpansionCategories({
  temporary_outpost_count,
}: {
  temporary_outpost_count: number
}): SystemTickCategory[] {
  if (temporary_outpost_count > 0) {
    return [ ...SYSTEM_TICK_EXPANSION_CATEGORIES_COMMIT_FIRST ]
  }
  return [ ...SYSTEM_TICK_EXPANSION_CATEGORIES ]
}
