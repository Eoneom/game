import { building_order } from '#core/building/constant/order'
import { BuildingCode } from '#core/building/constant/code'
import {
  isEnergyBuildingCode,
  isProductionBuildingCode,
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
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_bootstrap: boolean
}): number {
  const warehouse_default_rank = production_bootstrap ? 2 : 1

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
  if (isProductionBuildingCode(building_code)) {
    return production_bootstrap ? 0 : 3
  }
  return 2
}

function systemUpgradeRank({
  building_code,
  resource_stock,
  warehouses_capacity,
  production_energy_ratio,
  production_bootstrap,
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_energy_ratio: number
  production_bootstrap: boolean
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
  })
  const plastic_warehouse_full = isWarehouseResourceFull({
    stock: resource_stock.plastic,
    capacity: warehouses_capacity.plastic,
  })
  if (building_code === BuildingCode.MUSHROOM_FARM
    && resource_stock.mushroom < resource_stock.plastic
    && !plastic_warehouse_full) {
    return Math.min(rank, 0)
  }
  return rank
}

function productionUpgradeLevelTiebreaker<
  T extends { code: BuildingCode, level: number }
>(left: T, right: T): number {
  const left_production = isProductionBuildingCode(left.code)
  const right_production = isProductionBuildingCode(right.code)
  if (left_production && right_production) {
    return left.level - right.level
  }
  return 0
}

function mushroomIncomeTiebreaker<
  T extends { code: BuildingCode, level: number }
>(left: T, right: T, resource_stock: Resource): number {
  const mushroom_tight = resource_stock.mushroom < resource_stock.plastic
  if (!mushroom_tight) {
    return 0
  }
  if (left.code === BuildingCode.MUSHROOM_FARM && right.code === BuildingCode.RECYCLING_PLANT) {
    return -1
  }
  if (left.code === BuildingCode.RECYCLING_PLANT && right.code === BuildingCode.MUSHROOM_FARM) {
    return 1
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

  return [ ...buildings ].sort((left, right) => {
    const rank_difference = systemUpgradeRank({
      building_code: left.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
      production_bootstrap,
    }) - systemUpgradeRank({
      building_code: right.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
      production_bootstrap,
    })
    if (rank_difference !== 0) {
      return rank_difference
    }
    const mushroom_income_difference = mushroomIncomeTiebreaker(left, right, resource_stock)
    if (mushroom_income_difference !== 0) {
      return mushroom_income_difference
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
