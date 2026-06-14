import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
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
  isConsumingBuildingCode,
  isEnergyBuildingCode,
  isNonProductionConsumingBuildingCode,
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

    const metadata = await this.getMetadata({
      building,
      player_id
    })
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

  private async getMetadata({
    building,
    player_id
  }: {
    building: BuildingEntity
    player_id: string
  }): Promise<Record<string, unknown>> {
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
      const city = await this.repository.city.get(building.city_id)
      const city_cell = await this.repository.cell.getById(city.cell_id)
      const coefficients = city_cell.resource_coefficient
      const { production_energy_ratio } = await AppService.getCityEnergyConsumptionBreakdown({
        city_id: building.city_id,
        player_id
      })

      const base_current_production = BuildingService.getEarningsBySecond({
        level: building.level,
        code: building.code,
        coefficients
      })
      const base_next_production = BuildingService.getEarningsBySecond({
        level: building.level + 1,
        code: building.code,
        coefficients
      })

      const energy_upgrade_warning = await this.getEnergyUpgradeWarning({
        building,
        player_id
      })

      return {
        current_production: Math.round(base_current_production * production_energy_ratio * 100) / 100,
        next_production: Math.round(base_next_production * production_energy_ratio * 100) / 100,
        current_consumption: BuildingService.getEnergyConsumption({
          code: building.code,
          level: building.level
        }),
        next_consumption: BuildingService.getEnergyConsumption({
          code: building.code,
          level: building.level + 1
        }),
        energy_upgrade_warning
      }
    }

    if (isNonProductionConsumingBuildingCode(building.code)) {
      const current_consumption = BuildingService.getEnergyConsumption({
        code: building.code,
        level: building.level
      })
      const next_consumption = BuildingService.getEnergyConsumption({
        code: building.code,
        level: building.level + 1
      })
      const energy_upgrade_warning = await this.getEnergyUpgradeWarning({
        building,
        player_id
      })

      return {
        current_consumption,
        next_consumption,
        energy_upgrade_warning
      }
    }

    if (isEnergyBuildingCode(building.code)) {
      const city = await this.repository.city.get(building.city_id)
      const [
        city_cell,
        photovoltaic_optimization
      ] = await Promise.all([
        this.repository.cell.getById(city.cell_id),
        this.repository.technology.get({
          player_id,
          code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION
        })
      ])
      const coefficient = city_cell.solar_coefficient
      const efficiency_level = photovoltaic_optimization.level

      const current_energy = BuildingService.getEnergy({
        level: building.level,
        coefficient,
        efficiency_level
      })
      const next_energy = BuildingService.getEnergy({
        level: building.level + 1,
        coefficient,
        efficiency_level
      })

      return {
        current_energy,
        next_energy
      }
    }

    return {}
  }

  private async getEnergyUpgradeWarning({
    building,
    player_id
  }: {
    building: BuildingEntity
    player_id: string
  }): Promise<boolean> {
    if (!isConsumingBuildingCode(building.code)) {
      return false
    }

    const [
      {
        energy_consumption,
        energy_supply
      },
      current_building_consumption,
      next_building_consumption
    ] = await Promise.all([
      AppService.getCityEnergyConsumptionBreakdown({
        city_id: building.city_id,
        player_id
      }),
      Promise.resolve(BuildingService.getEnergyConsumption({
        code: building.code,
        level: building.level
      })),
      Promise.resolve(BuildingService.getEnergyConsumption({
        code: building.code,
        level: building.level + 1
      }))
    ])

    return BuildingService.wouldUpgradeExceedEnergySupply({
      supply: energy_supply,
      total_consumption: energy_consumption,
      current_building_consumption,
      next_building_consumption
    })
  }
}
