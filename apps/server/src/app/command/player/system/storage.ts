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
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
}): number {
  if (building_code === BuildingCode.PLASTIC_WAREHOUSE
    && isStorageResourcePressured({
      stock: resource_stock.plastic,
      capacity: warehouses_capacity.plastic,
    })) {
    return 0
  }
  if (building_code === BuildingCode.MUSHROOM_WAREHOUSE
    && isStorageResourcePressured({
      stock: resource_stock.mushroom,
      capacity: warehouses_capacity.mushroom,
    })) {
    return 0
  }
  if (isWarehouseBuildingCode(building_code)) {
    return 1
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
}: {
  building_code: BuildingCode
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  production_energy_ratio: number
}): number {
  const energy_starved = production_energy_ratio < 1
  if (energy_starved && isEnergyBuildingCode(building_code)) {
    return -1
  }
  if (energy_starved && isProductionBuildingCode(building_code)) {
    return 4
  }
  return warehouseUpgradeRank({
    building_code,
    resource_stock,
    warehouses_capacity,
  })
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
  return [ ...buildings ].sort((left, right) => {
    const rank_difference = systemUpgradeRank({
      building_code: left.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
    }) - systemUpgradeRank({
      building_code: right.code,
      resource_stock,
      warehouses_capacity,
      production_energy_ratio,
    })
    if (rank_difference !== 0) {
      return rank_difference
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
