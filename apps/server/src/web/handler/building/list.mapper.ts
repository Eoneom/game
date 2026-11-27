import {
  BuildingListDataResponse
} from '@eoneom/api-client/src/endpoints/building/list'
import { ListBuildingQueryResponse } from '#query/building/list'

export const buildingListResponseMapper = ({
  buildings,
  upgrade_queue
}: ListBuildingQueryResponse): BuildingListDataResponse => {
  return {
    buildings: buildings.map(building => {
      const base = {
        id: building.id,
        code: building.code,
        level: building.level,
        upgrade_cost: {
          plastic: building.upgrade_cost.resource.plastic,
          mushroom: building.upgrade_cost.resource.mushroom,
          plasma: building.upgrade_cost.resource.plasma,
          duration: building.upgrade_cost.duration
        },
        requirement: building.requirement
      }
      if ('upgrade_at' in building) {
        return {
          ...base,
          upgrade_at: building.upgrade_at,
          upgrade_started_at: building.upgrade_started_at
        }
      }
      return base
    }),
    upgrade_queue: upgrade_queue.map(item => ({
      id: item.id,
      building_code: item.building_code,
      duration_seconds: item.duration_seconds,
      start_at: item.start_at,
      finish_at: item.finish_at
    }))
  }
}
