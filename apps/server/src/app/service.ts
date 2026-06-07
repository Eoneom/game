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
import { TroopService } from '#core/troop/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CellEntity } from '#core/world/cell/entity'
import { WorldError } from '#core/world/error'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource } from '#shared/resource'

export const NEUTRAL_CELL_COEFFICIENTS: Resource = {
  plastic: 1,
  mushroom: 1
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
    const city_cells_count = await repository.cell.getCityCellsCount({ city_id })
    return CityService.getMaximumBuildingLevels({ city_cells_count })
  }

  static async getCityEarningsBySecond({ city_id }: { city_id: string }): Promise<Resource> {
    const {
      mushroom_farm_level,
      recycling_plant_level,
      city_cell
    } = await this.loadCityProductionInputs(city_id)

    const coefficients = city_cell.resource_coefficient

    return {
      plastic: BuildingService.getEarningsBySecond({
        code: BuildingCode.RECYCLING_PLANT,
        level: recycling_plant_level,
        coefficients,
      }),
      mushroom: BuildingService.getEarningsBySecond({
        level: mushroom_farm_level,
        code: BuildingCode.MUSHROOM_FARM,
        coefficients,
      })
    }
  }

  static async getCityProductionBreakdown({ city_id }: { city_id: string }): Promise<{
    earnings_per_second: Resource
    pre_cell_earnings_per_second: Resource
    cell_resource_coefficient: Resource
  }> {
    const {
      mushroom_farm_level,
      recycling_plant_level,
      city_cell
    } = await this.loadCityProductionInputs(city_id)

    const cell_resource_coefficient = city_cell.resource_coefficient

    const plastic = BuildingService.getEarningsBySecond({
      code: BuildingCode.RECYCLING_PLANT,
      level: recycling_plant_level,
      coefficients: cell_resource_coefficient,
    })

    const mushroom = BuildingService.getEarningsBySecond({
      level: mushroom_farm_level,
      code: BuildingCode.MUSHROOM_FARM,
      coefficients: cell_resource_coefficient,
    })

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

    return {
      earnings_per_second: {
        plastic,
        mushroom
      },
      pre_cell_earnings_per_second: {
        plastic: pre_cell_plastic,
        mushroom: pre_cell_mushroom
      },
      cell_resource_coefficient
    }
  }

  static async getCityEnergyBreakdown({
    city_id,
    solar_panel_level
  }: {
    city_id: string
    solar_panel_level: number
  }): Promise<{
    energy: number
    pre_cell_energy: number
    cell_solar_coefficient: number
  }> {
    const repository = Factory.getRepository()
    const city_cell = await repository.cell.getCityCell({ city_id })
    const cell_solar_coefficient = city_cell.solar_coefficient

    const energy = BuildingService.getEnergy({
      level: solar_panel_level,
      coefficient: cell_solar_coefficient
    })

    const pre_cell_energy = BuildingService.getEnergy({
      level: solar_panel_level,
      coefficient: NEUTRAL_SOLAR_COEFFICIENT
    })

    return {
      energy,
      pre_cell_energy,
      cell_solar_coefficient
    }
  }

  static async getCityWarehousesCapacity({ city_id }: { city_id: string }): Promise<Resource> {
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

  static async getOutpostWarehousesCapacity({ player_id }: { player_id: string }): Promise<Resource> {
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
      farmer_count,
      recycler_count
    } = await this.loadOutpostProductionInputs(outpost_id)

    if (outpost.type !== OutpostType.PERMANENT) {
      return {
        earnings_per_second: {
          plastic: 0,
          mushroom: 0 
        },
        pre_cell_earnings_per_second: {
          plastic: 0,
          mushroom: 0 
        },
        cell_resource_coefficient: cell.resource_coefficient
      }
    }

    const cell_resource_coefficient = cell.resource_coefficient

    const plastic = TroopService.getEarningsBySecond({
      code: TroopCode.RECYCLER,
      count: recycler_count,
      coefficients: cell_resource_coefficient,
    })

    const mushroom = TroopService.getEarningsBySecond({
      code: TroopCode.FARMER,
      count: farmer_count,
      coefficients: cell_resource_coefficient,
    })

    const pre_cell_plastic = TroopService.getEarningsBySecond({
      code: TroopCode.RECYCLER,
      count: recycler_count,
      coefficients: NEUTRAL_CELL_COEFFICIENTS,
    })

    const pre_cell_mushroom = TroopService.getEarningsBySecond({
      code: TroopCode.FARMER,
      count: farmer_count,
      coefficients: NEUTRAL_CELL_COEFFICIENTS,
    })

    return {
      earnings_per_second: {
        plastic,
        mushroom
      },
      pre_cell_earnings_per_second: {
        plastic: pre_cell_plastic,
        mushroom: pre_cell_mushroom
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
      if (!cell.isAssigned()) {
        return cell
      }
    }
  }

  static async getCellsAround({ coordinates }: { coordinates: Coordinates }): Promise<CellEntity[]> {
    const repository = Factory.getRepository()
    const all_coordinates: Coordinates[] = [
      {
        x: coordinates.x - 1,
        y: coordinates.y,
        sector: coordinates.sector
      },
      {
        x: coordinates.x,
        y: coordinates.y - 1,
        sector: coordinates.sector
      },
      {
        x: coordinates.x + 1,
        y: coordinates.y,
        sector: coordinates.sector
      },
      {
        x: coordinates.x,
        y: coordinates.y + 1,
        sector: coordinates.sector
      }
    ]

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
    if (city_cell.city_id !== city.id || stock.cell_id !== city_cell.id) {
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
    farmer_count: number
    recycler_count: number
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

    const farmer_count = troops.find(troop => troop.code === TroopCode.FARMER)?.count ?? 0
    const recycler_count = troops.find(troop => troop.code === TroopCode.RECYCLER)?.count ?? 0

    return {
      outpost,
      cell,
      farmer_count,
      recycler_count
    }
  }

  private static async loadCityProductionInputs(city_id: string): Promise<{
    mushroom_farm_level: number
    recycling_plant_level: number
    city_cell: CellEntity
  }> {
    const repository = Factory.getRepository()
    const [
      mushroom_farm_level,
      recycling_plant_level,
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
      repository.cell.getCityCell({ city_id })
    ])

    return {
      mushroom_farm_level,
      recycling_plant_level,
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
