import { CityGetQuery } from '#query/city/get'
import { CityListQuery } from '#query/city/list'
import { BuildingListQuery } from '#query/building/list'
import {
  projectBuildingLevelsForPolicy,
} from '#command/player/system/pending-upgrades'
import {
  isCityWarehouseUnderPressure,
  isCoreProductionSatisfied,
} from '#command/player/system/storage'

export async function isEmpireProductionReadyForResearch(player_id: string): Promise<boolean> {
  const { cities } = await new CityListQuery().run({ player_id })
  const city = cities[0]
  if (!city) {
    return false
  }

  const [
    city_details,
    building_list,
  ] = await Promise.all([
    new CityGetQuery().run({
      city_id: city.id,
      player_id,
    }),
    new BuildingListQuery().run({
      city_id: city.id,
      player_id,
    }),
  ])

  const projected_buildings = projectBuildingLevelsForPolicy({
    buildings: building_list.buildings,
    upgrade_queue: building_list.upgrade_queue,
  })

  if (!isCoreProductionSatisfied(projected_buildings)) {
    return false
  }
  if (city_details.production_energy_ratio < 1) {
    return false
  }
  if (isCityWarehouseUnderPressure({
    resource_stock: city_details.resource_stock,
    warehouses_capacity: city_details.warehouses_capacity,
  })) {
    return false
  }

  return true
}
