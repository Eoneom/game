import type { Coordinates } from '#core/world/value/coordinates'

export type SystemFrontierCommitKind = 'base' | 'settle' | 'make-permanent'

export type SystemFrontierQueueEntry = {
  kind: SystemFrontierCommitKind
  coordinates: Coordinates
  cell_id: string
  score: number
}

export function sortFrontierQueue(
  entries: SystemFrontierQueueEntry[],
): SystemFrontierQueueEntry[] {
  return [ ...entries ].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }
    if (left.coordinates.x !== right.coordinates.x) {
      return left.coordinates.x - right.coordinates.x
    }
    return left.coordinates.y - right.coordinates.y
  })
}

export function shouldDeferExploreForFrontier(
  frontier_queue: readonly SystemFrontierQueueEntry[],
): boolean {
  return frontier_queue.length > 0
}

export function frontierQueueSummary(frontier_queue: readonly SystemFrontierQueueEntry[]): {
  length: number
  top_score: number | null
} {
  if (frontier_queue.length === 0) {
    return {
      length: 0,
      top_score: null,
    }
  }
  const sorted = sortFrontierQueue([ ...frontier_queue ])
  return {
    length: frontier_queue.length,
    top_score: sorted[0].score,
  }
}
