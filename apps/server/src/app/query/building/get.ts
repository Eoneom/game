import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { BuildingEntity } from '#core/building/entity'
import { PricingService } from '#core/pricing/service'
import { LevelCostValue } from '#core/pricing/value/level'
import { TechnologyCode } from '#core/technology/constant/code'
import { BuildingCode } from '#core/building/constant/code'
import { RequirementValue } from '#core/requirement/value/requirement'
import { RequirementService } from '#core/requirement/service'
import { CityError } from '#core/city/error'
import {
  isProductionBuildingCode,
  isWarehouseBuildingCode
} from '#core/building/helper'
import { BuildingService } from '#core/building/service'

export interface BuildingGetQueryRequest {
  city_id: string
  building_code: BuildingCode
  player_id: string
}

export interface BuildingGetQueryResponse {
  building: BuildingEntity
  cost: LevelCostValue
  requirement: RequirementValue
  metadata: Record<string, unknown>
  upgrade_at?: number
  upgrade_started_at?: number
}

export class BuildingGetQuery extends GenericQuery<BuildingGetQueryRequest, BuildingGetQueryResponse> {
  constructor() {
    super({ name: 'building:get' })
  }

  protected async get({
    building_code,
    city_id,
    player_id
  }: BuildingGetQueryRequest): Promise<BuildingGetQueryResponse> {
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const [
      building,
      architecture,
      pending_upgrade,
    ] = await Promise.all([
      this.repository.building.getInCity({
        city_id,
        code: building_code
      }),
      this.repository.technology.get({
        player_id,
        code: TechnologyCode.ARCHITECTURE
      }),
      Factory.getJobQueue().getPendingBuildingUpgrade({ city_id }),
    ])

    const metadata = await this.getMetadata({ building })
    const requirement = RequirementService.getBuildingRequirement({ building_code })
    const cost = PricingService.getBuildingLevelCost({
      code: building.code,
      level: building.level + 1,
      architecture_level: architecture.level
    })

    const is_upgrading = pending_upgrade?.building_id === building.id
    const upgrade_at = is_upgrading ? pending_upgrade.execute_at : undefined

    return {
      building,
      requirement,
      metadata,
      cost,
      upgrade_at,
      upgrade_started_at:
        upgrade_at != null ? upgrade_at - cost.duration * 1000 : undefined,
    }
  }

  private async getMetadata({ building }: { building: BuildingEntity}): Promise<Record<string, unknown>> {
    if (isWarehouseBuildingCode(building.code)) {
      const current_capacity = BuildingService.getWarehouseCapacity({
        level: building.level,
        code: building.code
      })
      const next_capacity = BuildingService.getWarehouseCapacity({
        level: building.level + 1,
        code: building.code
      })

      return {
        current_capacity,
        next_capacity
      }
    }

    if (isProductionBuildingCode(building.code)) {
      const level = await this.repository.building.getLevel({
        city_id: building.city_id,
        code: building.code
      })
      const city_cell = await this.repository.cell.getCityCell({ city_id: building.city_id })
      const coefficients = city_cell.resource_coefficient

      const current_production = BuildingService.getEarningsBySecond({
        level,
        code: building.code,
        coefficients
      })

      const next_production = BuildingService.getEarningsBySecond({
        level: level + 1,
        code: building.code,
        coefficients
      })

      return {
        current_production,
        next_production
      }
    }

    return {}
  }
}
