import { WORLD_SIZE } from '#core/world/constant/size'

export const normalizeCoordinate = (random_coordinate: number): number => {
  return Math.floor(random_coordinate * WORLD_SIZE) + 1
}
