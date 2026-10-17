import type { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'

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
