import { BuildingCode } from '#core/building/constant/code'
import { building_earnings } from '#core/building/constant/earnings'
import {
  building_energy,
  building_energy_consumption,
  ConsumingBuildingCode,
  SOLAR_EFFICIENCY_MULTIPLIER_PER_LEVEL
} from '#core/building/constant/energy'
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
    code: BuildingCode.MUSHROOM_FARM | BuildingCode.RECYCLING_PLANT | BuildingCode.CENTRAL_INDUCTOR
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

    const coefficient = code === BuildingCode.MUSHROOM_FARM
      ? coefficients.mushroom
      : code === BuildingCode.RECYCLING_PLANT
        ? coefficients.plastic
        : 1
    const coefficient_value = base_value * coefficient

    const per_game_second = Math.round(coefficient_value * 100) / 100
    return Math.round(per_game_second * gameTimeScale * 100) / 100
  }

  static getEnergyConsumption({
    code,
    level
  }: {
    code: ConsumingBuildingCode
    level: number
  }): number {
    if (level === 0) {
      return 0
    }

    const {
      base,
      multiplier
    } = building_energy_consumption[code]

    return Math.round(Math.pow(multiplier, level - 1) * base)
  }

  static getProductionEnergyRatio({
    supply,
    non_production_consumption,
    production_consumption
  }: {
    supply: number
    non_production_consumption: number
    production_consumption: number
  }): number {
    if (production_consumption === 0) {
      return 1
    }

    const available = supply - non_production_consumption
    if (available <= 0) {
      return 0
    }

    return Math.min(1, available / production_consumption)
  }

  static wouldUpgradeExceedEnergySupply({
    supply,
    total_consumption,
    current_building_consumption,
    next_building_consumption
  }: {
    supply: number
    total_consumption: number
    current_building_consumption: number
    next_building_consumption: number
  }): boolean {
    const projected_total = total_consumption - current_building_consumption + next_building_consumption
    return projected_total > supply
  }

  static getEnergy({
    level,
    coefficient = 1,
    efficiency_level = 0
  }: {
    level: number
    coefficient?: number
    efficiency_level?: number
  }): number {
    if (level === 0) {
      return 0
    }

    const {
      base,
      multiplier
    } = building_energy[BuildingCode.SOLAR_PANEL]

    const raw = Math.pow(multiplier, level - 1) * base * coefficient
    const with_efficiency = raw * Math.pow(SOLAR_EFFICIENCY_MULTIPLIER_PER_LEVEL, efficiency_level)

    return Math.round(with_efficiency)
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
