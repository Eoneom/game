export type RankCandidate = {
  entity_id: string
  /** Display tie-breaker (player or alliance name, faction code). */
  name: string
  points: number
}

type RankedCandidate = {
  entity_id: string
  rank: number
  /** 1-based display order: points descending, then name. */
  position: number
  points: number
}

const compareNames = (a: RankCandidate, b: RankCandidate): number => {
  const by_name = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  if (by_name !== 0) {
    return by_name
  }
  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1
  }
  return a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0
}

/**
 * Competition ranking ("1224"): equal points share a rank and the next rank skips the tied places.
 * Ties keep a stable display order by name.
 */
export function competitionRank(candidates: RankCandidate[]): RankedCandidate[] {
  const sorted = [ ...candidates ].sort((a, b) => b.points - a.points || compareNames(a, b))

  let rank = 0
  let previous_points: number | null = null
  return sorted.map((candidate, index) => {
    if (previous_points === null || candidate.points !== previous_points) {
      rank = index + 1
      previous_points = candidate.points
    }
    return {
      entity_id: candidate.entity_id,
      rank,
      position: index + 1,
      points: candidate.points,
    }
  })
}
