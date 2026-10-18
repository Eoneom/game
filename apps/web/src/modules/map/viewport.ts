export const WORLD_SIZE = 100
export const INITIAL_VIEWPORT_HALF_EXTENT = 5

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
