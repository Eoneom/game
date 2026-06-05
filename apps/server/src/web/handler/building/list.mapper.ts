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
      if ('upgrade_at' in building) {
        return {
          id: building.id,
          code: building.code,
          level: building.level,
          upgrade_at: building.upgrade_at,
          upgrade_started_at: building.upgrade_started_at
        }
      }
      return {
        id: building.id,
        code: building.code,
        level: building.level
      }
    }),
    upgrade_queue: upgrade_queue.map(item => ({
      id: item.id,
      building_code: item.building_code
    }))
  }
}
