import type { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  SYSTEM_TICK_EXPANSION_CATEGORIES,
  SYSTEM_TICK_EXPANSION_CATEGORIES_BASE_FIRST,
  type SystemTickCategory,
} from '#core/player/system/tick-category'

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

/** While the empire has fewer outposts than this, prefer basing over further explore. */
export const SYSTEM_EXPANSION_LOW_OUTPOST_COUNT = 2

export function systemExpansionBaseCellScore({
  can_found_city,
}: {
  can_found_city: boolean
}): (cell: ScoredCell) => number {
  return can_found_city
    ? systemExpansionCitySiteScore
    : systemExpansionOutpostResourceScore
}

export function systemExpansionMinBaseScore({
  can_found_city,
}: {
  can_found_city: boolean
}): number {
  return can_found_city ? 1.5 : 2
}

/**
 * Skip explore when a viable explored base site exists and the empire still
 * needs early outposts — avoids clearing the whole viewport before basing.
 */
export function shouldDeferExploreForBasing({
  outpost_count,
  best_base_score,
  best_unexplored_scout_score,
  can_found_city,
}: {
  outpost_count: number
  best_base_score: number | null
  best_unexplored_scout_score: number | null
  can_found_city: boolean
}): boolean {
  if (outpost_count >= SYSTEM_EXPANSION_LOW_OUTPOST_COUNT) {
    return false
  }
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

export function systemTickExpansionCategories({
  outpost_count,
}: {
  outpost_count: number
}): SystemTickCategory[] {
  return outpost_count < SYSTEM_EXPANSION_LOW_OUTPOST_COUNT
    ? [ ...SYSTEM_TICK_EXPANSION_CATEGORIES_BASE_FIRST ]
    : [ ...SYSTEM_TICK_EXPANSION_CATEGORIES ]
}
