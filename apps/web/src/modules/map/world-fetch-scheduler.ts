import { WorldGetCellsDetail } from '@eoneom/api-client'

import { boundsNeedsFetch, type CellCache } from '#map/cell-cache'
import { fetchBoundsAround, type PanDirection, type ViewportBounds } from '#map/viewport'

export const NAVIGATION_DEBOUNCE_MS = 90

export type NavigationFetchPlan =
  | { kind: 'immediate', detail: 'terrain' }
  | { kind: 'debounced', detail: WorldGetCellsDetail }
  | { kind: 'none' }

export function planNavigationFetch({
  cache,
  bounds,
  pendingDetail,
}: {
  cache: CellCache
  bounds: ViewportBounds
  pendingDetail: WorldGetCellsDetail
}): NavigationFetchPlan {
  if (boundsNeedsFetch(cache, bounds)) {
    return { kind: 'immediate', detail: 'terrain' }
  }
  return { kind: 'debounced', detail: pendingDetail }
}

export function planPanEndFetch({
  cache,
  bounds,
}: {
  cache: CellCache
  bounds: ViewportBounds
}): { shouldFetch: boolean, detail: 'terrain' } {
  return {
    shouldFetch: boundsNeedsFetch(cache, bounds),
    detail: 'terrain',
  }
}

export function fetchBoundsForNavigation(
  center: { x: number; y: number },
  half_extent: number,
  panDirection?: PanDirection | null,
): ViewportBounds {
  return fetchBoundsAround(center, half_extent, panDirection)
}
