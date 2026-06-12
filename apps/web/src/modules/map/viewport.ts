export const WORLD_SIZE = 100
export const INITIAL_VIEWPORT_HALF_EXTENT = 5

export type ViewportBounds = {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export function viewportBoundsAround(center: { x: number; y: number }): ViewportBounds {
  return {
    min_x: Math.max(1, center.x - INITIAL_VIEWPORT_HALF_EXTENT),
    max_x: Math.min(WORLD_SIZE, center.x + INITIAL_VIEWPORT_HALF_EXTENT),
    min_y: Math.max(1, center.y - INITIAL_VIEWPORT_HALF_EXTENT),
    max_y: Math.min(WORLD_SIZE, center.y + INITIAL_VIEWPORT_HALF_EXTENT),
  }
}
