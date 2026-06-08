import { OUTPOST_COUNT_LIMIT } from '#core/outpost/constant/limit'
import { outpost_capacity } from '#core/outpost/constant/capacity'
import { WarehouseCapacity } from '#shared/resource'

export class OutpostService {
  static getCountLimit(): number {
    return OUTPOST_COUNT_LIMIT
  }

  static isLimitReached({ existing_outposts_count }: { existing_outposts_count: number }): boolean {
    return existing_outposts_count >= OUTPOST_COUNT_LIMIT
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
