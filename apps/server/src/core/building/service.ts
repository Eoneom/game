import { BuildingCode } from '#core/building/constant/code'
import { building_earnings } from '#core/building/constant/earnings'
import { building_order } from '#core/building/constant/order'
import { warehouses_capacity } from '#core/building/constant/warehouse-capacity'
import { BuildingEntity } from '#core/building/entity'
import { id } from '#shared/identification'
import { Resource } from '#shared/resource'
import { gameTimeScale } from '#shared/game-time-scale'

export class BuildingService {
  static init({ city_id }: { city_id: string }): BuildingEntity[] {
    return Object.values(BuildingCode).map(code => {
      return BuildingEntity.create({
        id: id(),
        code,
        city_id,
        level: 0
      })
    })
  }

  static getEarningsBySecond({
    code,
    level,
    coefficients,
  }: {
    code: BuildingCode.MUSHROOM_FARM | BuildingCode.RECYCLING_PLANT
    level: number
    coefficients: Resource
  }): number {
    if (level === 0) {
      return 0
    }

    const {
      base,
      multiplier
    } = building_earnings[code]
    const base_value = Math.pow(multiplier, level - 1) * base

    const coefficient = code === BuildingCode.MUSHROOM_FARM ? coefficients.mushroom : coefficients.plastic
    const coefficient_value = base_value * coefficient

    const per_game_second = Math.round(coefficient_value * 100) / 100
    return Math.round(per_game_second * gameTimeScale * 100) / 100
  }

  static getWarehouseCapacity({
    level,
    code
  }: {
    level: number
    code: BuildingCode.MUSHROOM_WAREHOUSE | BuildingCode.PLASTIC_WAREHOUSE
  }): number {
    const {
      multiplier,
      base
    } = warehouses_capacity[code]

    return Math.pow(multiplier, level)*base
  }

  static sortBuildings({ buildings }: { buildings: BuildingEntity[] }): BuildingEntity[] {
    return buildings.sort((a, b) => building_order[a.code] - building_order[b.code])
  }
}
