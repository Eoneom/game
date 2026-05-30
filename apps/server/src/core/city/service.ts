import {
  AUX_CITY_CELL_BUILDING_COUNT,
  CITY_COUNT_LIMIT,
  MAIN_CITY_CELL_BUILDING_COUNT
} from '#core/city/constant'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'

export class CityService {
  static getCountLimit(): number {
    return CITY_COUNT_LIMIT
  }

  static isLimitReached(cities_count: number): boolean {
    return cities_count >= CITY_COUNT_LIMIT
  }

  static getMaximumBuildingLevels({ city_cells_count }: { city_cells_count: number }): number {
    return MAIN_CITY_CELL_BUILDING_COUNT + (city_cells_count - 1) * AUX_CITY_CELL_BUILDING_COUNT
  }

  static settle({
    name,
    player_id,
    does_city_exist
  }: {
    name: string,
    player_id: string,
    does_city_exist: boolean
  }): CityEntity {
    if (does_city_exist) {
      throw new Error(CityError.ALREADY_EXISTS)
    }

    return CityEntity.initCity({
      name,
      player_id
    })
  }
}
