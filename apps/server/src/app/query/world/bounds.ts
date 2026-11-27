import { WORLD_SIZE } from '#core/world/constant/size'
import { WorldError } from '#core/world/error'

export interface WorldBounds {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

/** Integer bounds inside 1–WORLD_SIZE, ordered, each side at most `max_side` cells; else `world:invalid-bounds`. */
export const assertWorldBounds = (bounds: WorldBounds, max_side: number): void => {
  const {
    min_x, max_x, min_y, max_y
  } = bounds
  if ([
    min_x,
    max_x,
    min_y,
    max_y
  ].some(value => !Number.isInteger(value) || value < 1 || value > WORLD_SIZE)) {
    throw new Error(WorldError.INVALID_BOUNDS)
  }
  if (min_x > max_x || min_y > max_y) {
    throw new Error(WorldError.INVALID_BOUNDS)
  }
  if ((max_x - min_x + 1) > max_side || (max_y - min_y + 1) > max_side) {
    throw new Error(WorldError.INVALID_BOUNDS)
  }
}
