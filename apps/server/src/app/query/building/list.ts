import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { BuildingService } from '#core/building/service'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'

export interface ListBuildingRequest {
  city_id: string
  player_id: string
}

export type BuildingListEntry =
  | {
      id: string
      code: BuildingCode
      level: number
      upgrade_at: number
      upgrade_started_at: number
    }
  | {
      id: string
      code: BuildingCode
      level: number
    }

export interface BuildingUpgradeQueueEntry {
  id: string
  building_code: BuildingCode
  duration_seconds: number
  start_at: number
  finish_at: number
}

export interface ListBuildingQueryResponse {
  buildings: BuildingListEntry[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}

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
    const response_buildings: BuildingListEntry[] = sorted.map(building => {
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

    const projected_levels = new Map<BuildingCode, number>()
    for (const building of sorted) {
      const level_after_active = pending_upgrade?.building_id === building.id
        ? building.level + 1
        : building.level
      projected_levels.set(building.code, level_after_active)
    }

    let schedule_cursor = pending_upgrade?.execute_at ?? Date.now()
    const upgrade_queue_response: BuildingUpgradeQueueEntry[] = upgrade_queue.map(item => {
      const target_level = (projected_levels.get(item.building_code) ?? 0) + 1
      projected_levels.set(item.building_code, target_level)
      const { duration } = PricingService.getBuildingLevelCost({
        level: target_level,
        code: item.building_code,
        architecture_level: architecture.level,
      })
      const start_at = schedule_cursor
      const finish_at = schedule_cursor + duration * 1000
      schedule_cursor = finish_at
      return {
        id: item.id,
        building_code: item.building_code,
        duration_seconds: duration,
        start_at,
        finish_at,
      }
    })

    return {
      buildings: response_buildings,
      upgrade_queue: upgrade_queue_response,
    }
  }
}
