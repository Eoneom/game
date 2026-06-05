import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { CityError } from '#core/city/error'
import { BuildingService } from '#core/building/service'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { BuildingListDataResponse } from '@eoneom/api-client/src/endpoints/building/list'

export interface ListBuildingRequest {
  city_id: string,
  player_id: string
}

export type ListBuildingQueryResponse = BuildingListDataResponse

export class BuildingListQuery extends GenericQuery<ListBuildingRequest, ListBuildingQueryResponse> {
  constructor() {
    super({ name: 'building:list' })
  }

  protected async get({
    city_id,
    player_id
  }: ListBuildingRequest): Promise<ListBuildingQueryResponse> {
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const [
      buildings,
      architecture,
      pending_upgrade,
      upgrade_queue
    ] = await Promise.all([
      this.repository.building.list({ city_id }),
      this.repository.technology.get({
        player_id,
        code: TechnologyCode.ARCHITECTURE
      }),
      Factory.getJobQueue().getPendingBuildingUpgrade({ city_id }),
      this.repository.building_upgrade_queue.listByCity({ city_id }),
    ])

    const sorted = BuildingService.sortBuildings({ buildings })
    const response_buildings: BuildingListDataResponse['buildings'] = sorted.map(building => {
      if (!pending_upgrade || pending_upgrade.building_id !== building.id) {
        return {
          id: building.id,
          code: building.code,
          level: building.level,
        }
      }
      const { duration } = PricingService.getBuildingLevelCost({
        level: building.level + 1,
        code: building.code,
        architecture_level: architecture.level
      })
      const upgrade_at = pending_upgrade.execute_at
      return {
        id: building.id,
        code: building.code,
        level: building.level,
        upgrade_at,
        upgrade_started_at: upgrade_at - duration * 1000
      }
    })

    return {
      buildings: response_buildings,
      upgrade_queue: upgrade_queue.map(item => ({
        id: item.id,
        building_code: item.building_code
      }))
    }
  }
}
