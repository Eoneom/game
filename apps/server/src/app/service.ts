import { Factory } from '#adapter/factory'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingService } from '#core/building/service'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { CityService } from '#core/city/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostService } from '#core/outpost/service'
import {
  Levels,
  RequirementService
} from '#core/requirement/service'
import { RequirementValue } from '#core/requirement/value/requirement'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CellEntity } from '#core/world/cell/entity'
import { WORLD_SIZE } from '#core/world/constant/size'
import { WorldError } from '#core/world/error'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource, WarehouseCapacity } from '#shared/resource'

export const NEUTRAL_CELL_COEFFICIENTS: Resource = {
  plastic: 1,
  mushroom: 1,
  plasma: 1
}

export const NEUTRAL_SOLAR_COEFFICIENT = 1

export class AppService {
  static async getExploredCellIds({ coordinates }: { coordinates: Coordinates }): Promise<string[]> {
    const repository = Factory.getRepository()
    const cell = await repository.cell.getCell({ coordinates })
    return [ cell.id ]
  }

  static async getCityMaximumBuildingLevels({ city_id }: { city_id: string }): Promise<number> {
    const repository = Factory.getRepository()
    await repository.city.get(city_id)
    return CityService.getMaximumBuildingLevels()
  }

  static async getCityEarningsBySecond({
    city_id,
    player_id
  }: {
    city_id: string
    player_id: string
  }): Promise<Resource> {
    const {
      mushroom_farm_level,
      recycling_plant_level,
      central_inductor_level,
      city_cell
    } = await this.loadCityBuildingLevels(city_id)

    const [
      coefficients,
      { production_energy_ratio }
    ] = await Promise.all([
      Promise.resolve(city_cell.resource_coefficient),
      this.getCityEnergyConsumptionBreakdown({
        city_id,
        player_id
      })
    ])

    const plastic = BuildingService.getEarningsBySecond({
      code: BuildingCode.RECYCLING_PLANT,
      level: recycling_plant_level,
      coefficients,
    }) * production_energy_ratio

    const mushroom = BuildingService.getEarningsBySecond({
      level: mushroom_farm_level,
      code: BuildingCode.MUSHROOM_FARM,
      coefficients,
    }) * production_energy_ratio

    const plasma = BuildingService.getEarningsBySecond({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: central_inductor_level,
      coefficients,
    }) * production_energy_ratio

    return {
      plastic: Math.round(plastic * 100) / 100,
      mushroom: Math.round(mushroom * 100) / 100,
      plasma: Math.round(plasma * 100) / 100
    }
  }

  static async getCityProductionBreakdown({
    city_id,
    player_id
  }: {
    city_id: string
    player_id: string
  }): Promise<{
    earnings_per_second: Resource
    pre_cell_earnings_per_second: Resource
    cell_resource_coefficient: Resource
    production_energy_ratio: number
  }> {
    const {
      mushroom_farm_level,
      recycling_plant_level,
      central_inductor_level,
      city_cell
    } = await this.loadCityBuildingLevels(city_id)

    const cell_resource_coefficient = city_cell.resource_coefficient

    const { production_energy_ratio } = await this.getCityEnergyConsumptionBreakdown({
      city_id,
      player_id
    })

    const plastic = BuildingService.getEarningsBySecond({
      code: BuildingCode.RECYCLING_PLANT,
      level: recycling_plant_level,
      coefficients: cell_resource_coefficient,
    }) * production_energy_ratio

    const mushroom = BuildingService.getEarningsBySecond({
      level: mushroom_farm_level,
      code: BuildingCode.MUSHROOM_FARM,
      coefficients: cell_resource_coefficient,
    }) * production_energy_ratio

    const plasma = BuildingService.getEarningsBySecond({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: central_inductor_level,
      coefficients: cell_resource_coefficient,
    }) * production_energy_ratio

    const pre_cell_plastic = BuildingService.getEarningsBySecond({
      code: BuildingCode.RECYCLING_PLANT,
      level: recycling_plant_level,
      coefficients: NEUTRAL_CELL_COEFFICIENTS,
    })

    const pre_cell_mushroom = BuildingService.getEarningsBySecond({
      level: mushroom_farm_level,
      code: BuildingCode.MUSHROOM_FARM,
      coefficients: NEUTRAL_CELL_COEFFICIENTS,
    })

    const pre_cell_plasma = BuildingService.getEarningsBySecond({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: central_inductor_level,
      coefficients: NEUTRAL_CELL_COEFFICIENTS,
    })

    return {
      earnings_per_second: {
        plastic: Math.round(plastic * 100) / 100,
        mushroom: Math.round(mushroom * 100) / 100,
        plasma: Math.round(plasma * 100) / 100
      },
      pre_cell_earnings_per_second: {
        plastic: pre_cell_plastic,
        mushroom: pre_cell_mushroom,
        plasma: pre_cell_plasma
      },
      cell_resource_coefficient,
      production_energy_ratio
    }
  }

  static async getCityEnergyConsumptionBreakdown({
    city_id,
    player_id
  }: {
    city_id: string
    player_id: string
  }): Promise<{
    energy_consumption: number
    non_production_consumption: number
    production_consumption: number
    production_energy_ratio: number
    energy_supply: number
  }> {
    const levels = await this.loadCityBuildingLevels(city_id)
    const consumption = this.computeEnergyConsumptionFromLevels(levels)
    const energy_breakdown = await this.getCityEnergyBreakdown({
      city_id,
      player_id,
      solar_panel_level: levels.solar_panel_level
    })
    const production_energy_ratio = BuildingService.getProductionEnergyRatio({
      supply: energy_breakdown.energy,
      non_production_consumption: consumption.non_production_consumption,
      production_consumption: consumption.production_consumption
    })

    return {
      ...consumption,
      production_energy_ratio,
      energy_supply: energy_breakdown.energy
    }
  }

  static async getCityEnergyBreakdown({
    city_id,
    player_id,
    solar_panel_level
  }: {
    city_id: string
    player_id: string
    solar_panel_level: number
  }): Promise<{
    energy: number
    pre_cell_energy: number
    neutral_photovoltaic_energy: number
    cell_solar_coefficient: number
    photovoltaic_optimization_level: number
  }> {
    const repository = Factory.getRepository()
    const city = await repository.city.get(city_id)
    const [
      city_cell,
      photovoltaic_optimization
    ] = await Promise.all([
      repository.cell.getById(city.cell_id),
      repository.technology.get({
        player_id,
        code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION
      })
    ])
    const cell_solar_coefficient = city_cell.solar_coefficient
    const efficiency_level = photovoltaic_optimization.level

    const energy = BuildingService.getEnergy({
      level: solar_panel_level,
      coefficient: cell_solar_coefficient,
      efficiency_level
    })

    const pre_cell_energy = BuildingService.getEnergy({
      level: solar_panel_level,
      coefficient: NEUTRAL_SOLAR_COEFFICIENT,
      efficiency_level
    })

    const neutral_photovoltaic_energy = BuildingService.getEnergy({
      level: solar_panel_level,
      coefficient: NEUTRAL_SOLAR_COEFFICIENT,
      efficiency_level: 0
    })

    return {
      energy,
      pre_cell_energy,
      neutral_photovoltaic_energy,
      cell_solar_coefficient,
      photovoltaic_optimization_level: efficiency_level
    }
  }

  static async getCityWarehousesCapacity({ city_id }: { city_id: string }): Promise<WarehouseCapacity> {
    const repository = Factory.getRepository()
    const [
      mushroom_warehouse_level,
      plastic_warehouse_level
    ] = await Promise.all([
      repository.building.getLevel({
        city_id,
        code: BuildingCode.MUSHROOM_WAREHOUSE
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.PLASTIC_WAREHOUSE
      })
    ])

    return {
      mushroom: BuildingService.getWarehouseCapacity({
        level: mushroom_warehouse_level,
        code: BuildingCode.MUSHROOM_WAREHOUSE
      }),
      plastic: BuildingService.getWarehouseCapacity({
        level: plastic_warehouse_level,
        code: BuildingCode.PLASTIC_WAREHOUSE
      })
    }
  }

  static async getOutpostWarehousesCapacity({ player_id }: { player_id: string }): Promise<WarehouseCapacity> {
    const repository = Factory.getRepository()
    const logistics_level = await repository.technology.getLevel({
      player_id,
      code: TechnologyCode.OUTPOST_LOGISTICS
    })

    return OutpostService.getWarehousesCapacity({ logistics_level })
  }

  static async getOutpostEarningsBySecond({ outpost_id }: { outpost_id: string }): Promise<Resource> {
    const breakdown = await this.getOutpostProductionBreakdown({ outpost_id })
    return breakdown.earnings_per_second
  }

  static async getOutpostProductionBreakdown({ outpost_id }: { outpost_id: string }): Promise<{
    earnings_per_second: Resource
    pre_cell_earnings_per_second: Resource
    cell_resource_coefficient: Resource
  }> {
    const {
      outpost,
      cell,
      cultivator,
      salvager
    } = await this.loadOutpostProductionInputs(outpost_id)

    if (outpost.type !== OutpostType.PERMANENT) {
      return {
        earnings_per_second: {
          plastic: 0,
          mushroom: 0,
          plasma: 0
        },
        pre_cell_earnings_per_second: {
          plastic: 0,
          mushroom: 0,
          plasma: 0
        },
        cell_resource_coefficient: cell.resource_coefficient
      }
    }

    const cell_resource_coefficient = cell.resource_coefficient

    const plastic = salvager
      ? TroopService.getEarningsBySecond({
        code: salvager.code,
        count: salvager.count,
        coefficients: cell_resource_coefficient,
      })
      : 0

    const mushroom = cultivator
      ? TroopService.getEarningsBySecond({
        code: cultivator.code,
        count: cultivator.count,
        coefficients: cell_resource_coefficient,
      })
      : 0

    const pre_cell_plastic = salvager
      ? TroopService.getEarningsBySecond({
        code: salvager.code,
        count: salvager.count,
        coefficients: NEUTRAL_CELL_COEFFICIENTS,
      })
      : 0

    const pre_cell_mushroom = cultivator
      ? TroopService.getEarningsBySecond({
        code: cultivator.code,
        count: cultivator.count,
        coefficients: NEUTRAL_CELL_COEFFICIENTS,
      })
      : 0

    return {
      earnings_per_second: {
        plastic,
        mushroom,
        plasma: 0
      },
      pre_cell_earnings_per_second: {
        plastic: pre_cell_plastic,
        mushroom: pre_cell_mushroom,
        plasma: 0
      },
      cell_resource_coefficient
    }
  }

  static assertOutpostResourceStockContext({
    outpost,
    cell,
    stock,
    player_id
  }: {
    outpost: OutpostEntity
    cell: CellEntity
    stock: ResourceStockEntity
    player_id: string
  }): void {
    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }
    if (outpost.cell_id !== cell.id || stock.cell_id !== cell.id) {
      throw new Error(WorldError.CELL_OUTPOST_MISMATCH)
    }
  }

  static async getBuildingRequirementLevels({
    city_id,
    player_id,
    building_code
  }: {
    city_id: string
    player_id: string
    building_code: BuildingCode
  }): Promise<Levels> {
    const requirement = RequirementService.getBuildingRequirement({ building_code })
    return this.getRequirementLevels({
      city_id,
      player_id,
      requirement
    })
  }

  static async getTechnologyRequirementLevels({
    city_id,
    player_id,
    technology_code,
    technology_level
  }: {
    city_id: string
    player_id: string
    technology_code: TechnologyCode
    technology_level: number
  }): Promise<Levels> {
    const requirement = RequirementService.getTechnologyRequirement({
      technology_code,
      technology_level
    })
    return this.getRequirementLevels({
      city_id,
      player_id,
      requirement
    })
  }

  static async getTroopRequirementLevels({
    city_id,
    player_id,
    troop_code
  }: {
    city_id: string
    player_id: string
    troop_code: TroopCode
  }): Promise<Levels> {
    const requirement = RequirementService.getTroopRequirement({ troop_code })
    return this.getRequirementLevels({
      city_id,
      player_id,
      requirement
    })
  }

  static async selectCityFirstCell(): Promise<CellEntity> {
    const repository = Factory.getRepository()
    for (;;) {
      const random_coordinates = WorldService.getRandomCoordinates()
      const cell = await repository.cell.getCell({ coordinates: random_coordinates })
      const city_on_cell = await repository.city.searchByCell({ cell_id: cell.id })
      if (!city_on_cell) {
        return cell
      }
    }
  }

  static async getCellsAround({ coordinates }: { coordinates: Coordinates }): Promise<CellEntity[]> {
    const repository = Factory.getRepository()
    const candidates: Coordinates[] = [
      {
        x: coordinates.x - 1,
        y: coordinates.y
      },
      {
        x: coordinates.x,
        y: coordinates.y - 1
      },
      {
        x: coordinates.x + 1,
        y: coordinates.y
      },
      {
        x: coordinates.x,
        y: coordinates.y + 1
      }
    ]
    const all_coordinates = candidates.filter(cell_coordinates =>
      cell_coordinates.x >= 1
      && cell_coordinates.x <= WORLD_SIZE
      && cell_coordinates.y >= 1
      && cell_coordinates.y <= WORLD_SIZE
    )

    return Promise.all(all_coordinates.map(cell_coordinates => repository.cell.getCell({ coordinates: cell_coordinates })))
  }

  static assertResourceStockMatchesCityCell({
    city,
    city_cell,
    stock
  }: {
    city: CityEntity
    city_cell: CellEntity
    stock: ResourceStockEntity
  }): void {
    if (city.cell_id !== city_cell.id || stock.cell_id !== city_cell.id) {
      throw new Error(WorldError.CELL_CITY_MISMATCH)
    }
  }

  static assertCityResourceStockContext({
    city,
    city_cell,
    stock,
    player_id
  }: {
    city: CityEntity
    city_cell: CellEntity
    stock: ResourceStockEntity
    player_id: string
  }): void {
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }
    AppService.assertResourceStockMatchesCityCell({
      city,
      city_cell,
      stock 
    })
  }

  private static async loadOutpostProductionInputs(outpost_id: string): Promise<{
    outpost: OutpostEntity
    cell: CellEntity
    cultivator: { code: TroopCode; count: number } | undefined
    salvager: { code: TroopCode; count: number } | undefined
  }> {
    const repository = Factory.getRepository()
    const outpost = await repository.outpost.getById(outpost_id)
    const [
      cell,
      troops
    ] = await Promise.all([
      repository.cell.getById(outpost.cell_id),
      repository.troop.listInCell({
        cell_id: outpost.cell_id,
        player_id: outpost.player_id
      })
    ])

    return {
      outpost,
      cell,
      cultivator: TroopService.findByRole({
        troops,
        role: TroopRole.CULTIVATOR
      }),
      salvager: TroopService.findByRole({
        troops,
        role: TroopRole.SALVAGER
      })
    }
  }

  private static computeEnergyConsumptionFromLevels({
    recycling_plant_level,
    mushroom_farm_level,
    central_inductor_level,
    research_lab_level,
    cloning_factory_level
  }: {
    recycling_plant_level: number
    mushroom_farm_level: number
    central_inductor_level: number
    research_lab_level: number
    cloning_factory_level: number
  }): {
    energy_consumption: number
    non_production_consumption: number
    production_consumption: number
  } {
    const recycling_plant = BuildingService.getEnergyConsumption({
      code: BuildingCode.RECYCLING_PLANT,
      level: recycling_plant_level
    })
    const mushroom_farm = BuildingService.getEnergyConsumption({
      code: BuildingCode.MUSHROOM_FARM,
      level: mushroom_farm_level
    })
    const central_inductor = BuildingService.getEnergyConsumption({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: central_inductor_level
    })
    const research_lab = BuildingService.getEnergyConsumption({
      code: BuildingCode.RESEARCH_LAB,
      level: research_lab_level
    })
    const cloning_factory = BuildingService.getEnergyConsumption({
      code: BuildingCode.CLONING_FACTORY,
      level: cloning_factory_level
    })

    const production_consumption = recycling_plant + mushroom_farm + central_inductor
    const non_production_consumption = research_lab + cloning_factory

    return {
      energy_consumption: production_consumption + non_production_consumption,
      non_production_consumption,
      production_consumption
    }
  }

  private static async loadCityBuildingLevels(city_id: string): Promise<{
    mushroom_farm_level: number
    recycling_plant_level: number
    central_inductor_level: number
    research_lab_level: number
    cloning_factory_level: number
    solar_panel_level: number
    city_cell: CellEntity
  }> {
    const repository = Factory.getRepository()
    const city = await repository.city.get(city_id)
    const [
      mushroom_farm_level,
      recycling_plant_level,
      central_inductor_level,
      research_lab_level,
      cloning_factory_level,
      solar_panel_level,
      city_cell
    ] = await Promise.all([
      repository.building.getLevel({
        city_id,
        code: BuildingCode.MUSHROOM_FARM
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.RECYCLING_PLANT
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.CENTRAL_INDUCTOR
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.RESEARCH_LAB
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.CLONING_FACTORY
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.SOLAR_PANEL
      }),
      repository.cell.getById(city.cell_id)
    ])

    return {
      mushroom_farm_level,
      recycling_plant_level,
      central_inductor_level,
      research_lab_level,
      cloning_factory_level,
      solar_panel_level,
      city_cell
    }
  }

  private static async getRequirementLevels({
    city_id,
    player_id,
    requirement
  }: {
    city_id: string
    player_id: string
    requirement: RequirementValue
  }): Promise<Levels> {
    const repository = Factory.getRepository()
    const required_building_codes = requirement.buildings.map(req => req.code)
    const required_technology_codes = requirement.technologies.map(req => req.code)
    const [
      buildings,
      technologies
    ] = await Promise.all([
      repository.building.list({
        city_id,
        codes: required_building_codes
      }),
      repository.technology.list({
        player_id,
        codes: required_technology_codes
      })
    ])

    const building_levels: Record<BuildingCode, number> = buildings.reduce((acc, building) => {
      return {
        ...acc,
        [building.code]: building.level
      }
    }, {} as Record<BuildingCode, number>)

    const technology_levels: Record<TechnologyCode, number> = technologies.reduce((acc, technology) => {
      return {
        ...acc,
        [technology.code]: technology.level
      }
    }, {} as Record<TechnologyCode, number>)

    return {
      building: building_levels,
      technology: technology_levels
    }
  }
}
