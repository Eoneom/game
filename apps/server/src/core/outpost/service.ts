import {
  OUTPOST_COUNT_LIMIT,
  OUTPOST_EXPANSION_PER_LEVEL,
} from '#core/outpost/constant/limit'
import { outpost_capacity } from '#core/outpost/constant/capacity'
import { WarehouseCapacity } from '#shared/resource'

export class OutpostService {
  static getCountLimit({ expansion_level }: { expansion_level: number }): number {
    return OUTPOST_COUNT_LIMIT + expansion_level * OUTPOST_EXPANSION_PER_LEVEL
  }

  static isLimitReached({
    existing_outposts_count,
    expansion_level,
  }: {
    existing_outposts_count: number
    expansion_level: number
  }): boolean {
    return existing_outposts_count >= OutpostService.getCountLimit({ expansion_level })
  }

  static shouldBuildTemporaryOutpost({
    city_exists,
    outpost_exists
  }: {
    city_exists: boolean,
    outpost_exists: boolean
  }): boolean {
    return !city_exists && !outpost_exists
  }

  static getWarehousesCapacity({ logistics_level }: { logistics_level: number }): WarehouseCapacity {
    return {
      plastic: Math.pow(outpost_capacity.plastic.multiplier, logistics_level) * outpost_capacity.plastic.base,
      mushroom: Math.pow(outpost_capacity.mushroom.multiplier, logistics_level) * outpost_capacity.mushroom.base
    }
  }
}
