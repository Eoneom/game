export const WORLD_SIZE = 100
export const INITIAL_VIEWPORT_HALF_EXTENT = 5
/** Tighter zoom when opening or recentering the city/outpost world map (7×7 visible). */
export const CITY_MAP_INITIAL_HALF_EXTENT = 3
export const PREFETCH_MARGIN_CELLS = 3
/** Server `MAX_VIEWPORT_SIDE` — keep fetch bounds within one request. */
export const MAX_VIEWPORT_SIDE = 20

/** Inclusive cells per axis: 2 * half_extent + 1 (must be ≤ server MAX_VIEWPORT_SIDE). */
export const MAP_MIN_HALF_EXTENT = 2
/** Max half extent so side length 2 * half + 1 ≤ 20 (server `MAX_VIEWPORT_SIDE`). */
export const MAP_MAX_HALF_EXTENT = 9

export type ViewportBounds = {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export function viewportSideLength(half_extent: number): number {
  return 2 * half_extent + 1
}

export function clampHalfExtent(half_extent: number): number {
  return Math.max(
    MAP_MIN_HALF_EXTENT,
    Math.min(MAP_MAX_HALF_EXTENT, Math.round(half_extent)),
  )
}

export function viewportBoundsAround(
  center: { x: number; y: number },
  half_extent: number = INITIAL_VIEWPORT_HALF_EXTENT,
): ViewportBounds {
  const half = clampHalfExtent(half_extent)
  return {
    min_x: Math.max(1, center.x - half),
    max_x: Math.min(WORLD_SIZE, center.x + half),
    min_y: Math.max(1, center.y - half),
    max_y: Math.min(WORLD_SIZE, center.y + half),
  }
}

export type PanDirection = {
  dx: number
  dy: number
}

const clampBoundsSide = (bounds: ViewportBounds): ViewportBounds => {
  let { min_x, max_x, min_y, max_y } = bounds
  while (max_x - min_x + 1 > MAX_VIEWPORT_SIDE) {
    min_x += 1
  }
  while (max_y - min_y + 1 > MAX_VIEWPORT_SIDE) {
    min_y += 1
  }
  return {
    min_x,
    max_x,
    min_y,
    max_y,
  }
}

/** Visible bounds expanded by prefetch margin, clamped to `MAX_VIEWPORT_SIDE` per axis. */
export function fetchBoundsAround(
  center: { x: number; y: number },
  half_extent: number,
  panDirection?: PanDirection | null,
): ViewportBounds {
  const visibleHalf = clampHalfExtent(half_extent)
  let fetchHalf = visibleHalf + PREFETCH_MARGIN_CELLS
  while (viewportSideLength(fetchHalf) > MAX_VIEWPORT_SIDE) {
    fetchHalf -= 1
  }
  fetchHalf = Math.max(visibleHalf, fetchHalf)
  let bounds = viewportBoundsAround(center, fetchHalf)

  if (panDirection && (panDirection.dx !== 0 || panDirection.dy !== 0)) {
    if (panDirection.dx > 0) {
      bounds = {
        ...bounds,
        max_x: Math.min(WORLD_SIZE, bounds.max_x + 1),
      }
    } else if (panDirection.dx < 0) {
      bounds = {
        ...bounds,
        min_x: Math.max(1, bounds.min_x - 1),
      }
    }
    if (panDirection.dy > 0) {
      bounds = {
        ...bounds,
        max_y: Math.min(WORLD_SIZE, bounds.max_y + 1),
      }
    } else if (panDirection.dy < 0) {
      bounds = {
        ...bounds,
        min_y: Math.max(1, bounds.min_y - 1),
      }
    }
    bounds = clampBoundsSide(bounds)
  }

  return bounds
}

export function expandBoundsBy(
  bounds: ViewportBounds,
  margin: number,
): ViewportBounds {
  return {
    min_x: Math.max(1, bounds.min_x - margin),
    max_x: Math.min(WORLD_SIZE, bounds.max_x + margin),
    min_y: Math.max(1, bounds.min_y - margin),
    max_y: Math.min(WORLD_SIZE, bounds.max_y + margin),
  }
}
