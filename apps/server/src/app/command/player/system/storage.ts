import { building_order } from '#core/building/constant/order'
import { BuildingCode } from '#core/building/constant/code'
import {
  isCoreProductionBuildingCode,
  isEnergyBuildingCode,
  isProductionBuildingCode,
  isSystemUtilityBuildingCode,
  isWarehouseBuildingCode
} from '#core/building/helper'
import { Resource, WarehouseCapacity } from '#shared/resource'

/** Same ratio as web `HeaderResourcesItem` warehouse progress warn (`warnCapacity`). */
export const SYSTEM_WAREHOUSE_PRESSURE_FILL_RATIO = 0.7

export function isStorageResourcePressured({
  stock,
  capacity,
}: {
  stock: number
  capacity: number
}): boolean {
  if (capacity <= 0) {
    return stock > 0
  }
  return stock >= capacity * SYSTEM_WAREHOUSE_PRESSURE_FILL_RATIO
}

const CORE_PRODUCTION_BUILDING_CODES = [
  BuildingCode.RECYCLING_PLANT,
  BuildingCode.MUSHROOM_FARM,
] as const

export function needsCoreProductionBootstrap<
  T extends { code: BuildingCode, level: number }
>(buildings: T[]): boolean {
  return CORE_PRODUCTION_BUILDING_CODES.some((building_code) => {
    const building = buildings.find(candidate => candidate.code === building_code)
    return !building || building.level < 1
  })
}

/** Core plastic/mushroom production is caught up; prefer labs and other utility buildings. */
export function isCoreProductionSatisfied<
  T extends { code: BuildingCode, level: number }
>(buildings: T[]): boolean {
  if (needsCoreProductionBootstrap(buildings)) {
    return false
  }
  const mushroom_farm = buildings.find(building => building.code === BuildingCode.MUSHROOM_FARM)
  const recycling_plant = buildings.find(building => building.code === BuildingCode.RECYCLING_PLANT)
  if (!mushroom_farm || !recycling_plant) {
    return false
  }
  return Math.abs(mushroom_farm.level - recycling_plant.level) <= 1
}

function getCoreProductionLevels<
  T extends { code: BuildingCode, level: number }
>(buildings: T[]): {
  mushroom_farm_level: number
  recycling_plant_level: number
} {
  return {
    mushroom_farm_level: buildings.find(building => building.code === BuildingCode.MUSHROOM_FARM)?.level ?? 0,
    recycling_plant_level: buildings.find(building => building.code === BuildingCode.RECYCLING_PLANT)?.level ?? 0,
  }
}

function isWarehouseResourceFull({
  stock,
  capacity,
}: {
  stock: number
  capacity: number
}): boolean {
  return capacity > 0 && stock >= capacity
}

export function isCityWarehouseUnderPressure({
  resource_stock,
  warehouses_capacity,
}: {
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
}): boolean {
  return isStorageResourcePressured({
    stock: resource_stock.plastic,
    capacity: warehouses_capacity.plastic,
  })
    || isStorageResourcePressured({
      stock: resource_stock.mushroom,
      capacity: warehouses_capacity.mushroom,
    })
}

function warehouseUpgradeRank({
  building_code,
  resource_stock,
  warehouses_capacity,
  production_bootstrap,
  core_production_satisfied,
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_bootstrap: boolean
  core_production_satisfied: boolean
}): number {
  const warehouse_default_rank = production_bootstrap || core_production_satisfied ? 2 : 1

  if (building_code === BuildingCode.PLASTIC_WAREHOUSE) {
    const full = isWarehouseResourceFull({
      stock: resource_stock.plastic,
      capacity: warehouses_capacity.plastic,
    })
    const pressured = isStorageResourcePressured({
      stock: resource_stock.plastic,
      capacity: warehouses_capacity.plastic,
    })
    if (full) {
      return -1
    }
    if (!production_bootstrap && pressured) {
      return 0
    }
    return warehouse_default_rank
  }
  if (building_code === BuildingCode.MUSHROOM_WAREHOUSE) {
    const full = isWarehouseResourceFull({
      stock: resource_stock.mushroom,
      capacity: warehouses_capacity.mushroom,
    })
    const pressured = isStorageResourcePressured({
      stock: resource_stock.mushroom,
      capacity: warehouses_capacity.mushroom,
    })
    if (full) {
      return -1
    }
    if (!production_bootstrap && pressured) {
      return 0
    }
    return warehouse_default_rank
  }
  if (isWarehouseBuildingCode(building_code)) {
    return warehouse_default_rank
  }
  if (isSystemUtilityBuildingCode(building_code)) {
    return core_production_satisfied ? 1 : 2
  }
  if (isCoreProductionBuildingCode(building_code)) {
    if (production_bootstrap) {
      return 0
    }
    if (core_production_satisfied) {
      return 4
    }
    return 3
  }
  if (building_code === BuildingCode.CENTRAL_INDUCTOR) {
    return core_production_satisfied ? 2 : 3
  }
  if (isProductionBuildingCode(building_code)) {
    return 3
  }
  return 2
}

function systemUpgradeRank({
  building_code,
  resource_stock,
  warehouses_capacity,
  production_energy_ratio,
  production_bootstrap,
  core_production_satisfied,
  mushroom_farm_level,
  recycling_plant_level,
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_energy_ratio: number
  production_bootstrap: boolean
  core_production_satisfied: boolean
  mushroom_farm_level: number
  recycling_plant_level: number
}): number {
  const energy_starved = production_energy_ratio < 1
  if (energy_starved && isEnergyBuildingCode(building_code)) {
    return -1
  }
  if (energy_starved && isProductionBuildingCode(building_code)) {
    return 4
  }
  const rank = warehouseUpgradeRank({
    building_code,
    resource_stock,
    warehouses_capacity,
    production_bootstrap,
    core_production_satisfied,
  })
  const plastic_warehouse_full = isWarehouseResourceFull({
    stock: resource_stock.plastic,
    capacity: warehouses_capacity.plastic,
  })
  const mushroom_warehouse_full = isWarehouseResourceFull({
    stock: resource_stock.mushroom,
    capacity: warehouses_capacity.mushroom,
  })

  if (!production_bootstrap && !core_production_satisfied) {
    if (building_code === BuildingCode.RECYCLING_PLANT
      && recycling_plant_level < mushroom_farm_level) {
      return Math.min(rank, 0)
    }
    if (building_code === BuildingCode.MUSHROOM_FARM
      && mushroom_farm_level < recycling_plant_level) {
      return Math.min(rank, 0)
    }
  }

  if (building_code === BuildingCode.MUSHROOM_FARM
    && resource_stock.mushroom < resource_stock.plastic
    && !plastic_warehouse_full
    && !core_production_satisfied
    && mushroom_farm_level <= recycling_plant_level) {
    return Math.min(rank, 0)
  }
  if (building_code === BuildingCode.RECYCLING_PLANT
    && resource_stock.plastic < resource_stock.mushroom
    && !mushroom_warehouse_full
    && !core_production_satisfied
    && recycling_plant_level <= mushroom_farm_level) {
    return Math.min(rank, 0)
  }
  return rank
}

function productionUpgradeLevelTiebreaker<
  T extends { code: BuildingCode, level: number }
>(left: T, right: T): number {
  const left_production = isCoreProductionBuildingCode(left.code)
  const right_production = isCoreProductionBuildingCode(right.code)
  if (left_production && right_production) {
    return left.level - right.level
  }
  return 0
}

function utilityUpgradeLevelTiebreaker<
  T extends { code: BuildingCode, level: number }
>(left: T, right: T): number {
  const left_utility = isSystemUtilityBuildingCode(left.code)
  const right_utility = isSystemUtilityBuildingCode(right.code)
  if (left_utility && right_utility) {
    return left.level - right.level
  }
  return 0
}

function mushroomIncomeTiebreaker<
  T extends { code: BuildingCode, level: number }
>(left: T, right: T, {
  resource_stock,
  mushroom_farm_level,
  recycling_plant_level,
}: {
  resource_stock: Resource
  mushroom_farm_level: number
  recycling_plant_level: number
}): number {
  const mushroom_tight = resource_stock.mushroom < resource_stock.plastic
  const plastic_tight = resource_stock.plastic < resource_stock.mushroom

  if (left.code === BuildingCode.MUSHROOM_FARM && right.code === BuildingCode.RECYCLING_PLANT) {
    if (mushroom_farm_level > recycling_plant_level) {
      return 1
    }
    if (mushroom_farm_level < recycling_plant_level) {
      return -1
    }
    if (mushroom_tight) {
      return -1
    }
    if (plastic_tight) {
      return 1
    }
    return 0
  }
  if (left.code === BuildingCode.RECYCLING_PLANT && right.code === BuildingCode.MUSHROOM_FARM) {
    if (recycling_plant_level > mushroom_farm_level) {
      return -1
    }
    if (recycling_plant_level < mushroom_farm_level) {
      return 1
    }
    if (plastic_tight) {
      return -1
    }
    if (mushroom_tight) {
      return 1
    }
    return 0
  }
  return 0
}

export function sortBuildingsForSystemUpgrade<
  T extends { code: BuildingCode, level: number }
>({
  buildings,
  resource_stock,
  warehouses_capacity,
  production_energy_ratio = 1,
}: {
  buildings: T[]
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_energy_ratio?: number
}): T[] {
  const production_bootstrap = needsCoreProductionBootstrap(buildings)
  const core_production_satisfied = isCoreProductionSatisfied(buildings)
  const {
    mushroom_farm_level,
    recycling_plant_level,
  } = getCoreProductionLevels(buildings)

  return [ ...buildings ].sort((left, right) => {
    const rank_difference = systemUpgradeRank({
      building_code: left.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
      production_bootstrap,
      core_production_satisfied,
      mushroom_farm_level,
      recycling_plant_level,
    }) - systemUpgradeRank({
      building_code: right.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
      production_bootstrap,
      core_production_satisfied,
      mushroom_farm_level,
      recycling_plant_level,
    })
    if (rank_difference !== 0) {
      return rank_difference
    }
    const mushroom_income_difference = mushroomIncomeTiebreaker(left, right, {
      resource_stock,
      mushroom_farm_level,
      recycling_plant_level,
    })
    if (mushroom_income_difference !== 0) {
      return mushroom_income_difference
    }
    const utility_level_difference = utilityUpgradeLevelTiebreaker(left, right)
    if (utility_level_difference !== 0) {
      return utility_level_difference
    }
    const production_level_difference = productionUpgradeLevelTiebreaker(left, right)
    if (production_level_difference !== 0) {
      return production_level_difference
    }
    return building_order[left.code] - building_order[right.code]
  })
}

export function resourcesForTransportToDestination({
  origin_stock,
  destination_space_remaining,
}: {
  origin_stock: Resource
  destination_space_remaining: WarehouseCapacity
}): Resource {
  return {
    plastic: Math.min(origin_stock.plastic, destination_space_remaining.plastic),
    mushroom: Math.min(origin_stock.mushroom, destination_space_remaining.mushroom),
    plasma: origin_stock.plasma,
  }
}
