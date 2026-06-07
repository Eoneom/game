import type { MockInstance } from 'vitest'
import {
  AppService, NEUTRAL_CELL_COEFFICIENTS 
} from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { BuildingService } from '#core/building/service'
import { CityService } from '#core/city/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostService } from '#core/outpost/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'
import { WorldService } from '#core/world/service'
import { id } from '#shared/identification'

describe('AppService', () => {
  const setRepositoryMock = (repository: Repository) => {
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository)
  }

  beforeEach(() => {
    setRepositoryMock({} as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCityProductionBreakdown', () => {
    const city_id = id()
    const coordinates: Coordinates = {
      x: 1,
      y: 2,
      sector: 3
    }
    const resource_coefficient = {
      plastic: 0.85,
      mushroom: 1.1
    }
    const city_cell = CellEntity.create({
      id: id(),
      coordinates,
      type: CellType.LAKE,
      resource_coefficient,
      solar_coefficient: 1
    })
  
    beforeEach(() => {
      const repository = {
        building: {
          getLevel: vi.fn().mockImplementation(({ code }: { code: BuildingCode }) => {
            if (code === BuildingCode.MUSHROOM_FARM) {
              return Promise.resolve(2)
            }
            if (code === BuildingCode.RECYCLING_PLANT) {
              return Promise.resolve(1)
            }
            if (code === BuildingCode.RESEARCH_LAB) {
              return Promise.resolve(0)
            }
            if (code === BuildingCode.CLONING_FACTORY) {
              return Promise.resolve(0)
            }
            if (code === BuildingCode.SOLAR_PANEL) {
              return Promise.resolve(5)
            }
            return Promise.resolve(0)
          })
        },
        cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) },
        technology: {
          get: vi.fn().mockResolvedValue(TechnologyEntity.create({
            id: id(),
            player_id: id(),
            code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
            level: 0
          }))
        }
      } as unknown as Repository
  
      setRepositoryMock(repository)
    })
  
    it('returns same earnings_per_second as getCityEarningsBySecond', async () => {
      const player_id = id()
      const [
        breakdown,
        earnings 
      ] = await Promise.all([
        AppService.getCityProductionBreakdown({
          city_id,
          player_id
        }),
        AppService.getCityEarningsBySecond({
          city_id,
          player_id
        })
      ])
  
      expect(breakdown.earnings_per_second).toEqual(earnings)
    })
  
    it('exposes cell coefficients and pre-cell rates from BuildingService', async () => {
      const player_id = id()
      const breakdown = await AppService.getCityProductionBreakdown({
        city_id,
        player_id
      })
  
      expect(breakdown.cell_resource_coefficient).toEqual(resource_coefficient)
  
      expect(breakdown.pre_cell_earnings_per_second.plastic).toBe(BuildingService.getEarningsBySecond({
        code: BuildingCode.RECYCLING_PLANT,
        level: 1,
        coefficients: NEUTRAL_CELL_COEFFICIENTS
      }))
      expect(breakdown.pre_cell_earnings_per_second.mushroom).toBe(BuildingService.getEarningsBySecond({
        code: BuildingCode.MUSHROOM_FARM,
        level: 2,
        coefficients: NEUTRAL_CELL_COEFFICIENTS
      }))
  
      expect(breakdown.earnings_per_second.plastic).toBe(BuildingService.getEarningsBySecond({
        code: BuildingCode.RECYCLING_PLANT,
        level: 1,
        coefficients: resource_coefficient
      }))
    })

    it('reduces earnings when energy supply is insufficient for production', async () => {
      const player_id = id()
      const repository = {
        building: {
          getLevel: vi.fn().mockImplementation(({ code }: { code: BuildingCode }) => {
            if (code === BuildingCode.MUSHROOM_FARM) {
              return Promise.resolve(3)
            }
            if (code === BuildingCode.RECYCLING_PLANT) {
              return Promise.resolve(3)
            }
            if (code === BuildingCode.RESEARCH_LAB) {
              return Promise.resolve(1)
            }
            if (code === BuildingCode.CLONING_FACTORY) {
              return Promise.resolve(0)
            }
            if (code === BuildingCode.SOLAR_PANEL) {
              return Promise.resolve(1)
            }
            return Promise.resolve(0)
          })
        },
        cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) },
        technology: {
          get: vi.fn().mockResolvedValue(TechnologyEntity.create({
            id: id(),
            player_id,
            code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
            level: 0
          }))
        }
      } as unknown as Repository

      setRepositoryMock(repository)

      const earnings = await AppService.getCityEarningsBySecond({
        city_id,
        player_id
      })

      const base_plastic = BuildingService.getEarningsBySecond({
        code: BuildingCode.RECYCLING_PLANT,
        level: 3,
        coefficients: resource_coefficient
      })
      const base_mushroom = BuildingService.getEarningsBySecond({
        code: BuildingCode.MUSHROOM_FARM,
        level: 3,
        coefficients: resource_coefficient
      })

      expect(earnings.plastic).toBeLessThan(base_plastic)
      expect(earnings.mushroom).toBeLessThan(base_mushroom)
    })
  })

  describe('getOutpostProductionBreakdown', () => {
    const outpost_id = id()
    const player_id = id()
    const cell_id = id()
    const coordinates: Coordinates = {
      x: 1,
      y: 2,
      sector: 3
    }
    const resource_coefficient = {
      plastic: 0.85,
      mushroom: 1.1
    }
    const cell = CellEntity.create({
      id: cell_id,
      coordinates,
      type: CellType.LAKE,
      resource_coefficient,
      solar_coefficient: 1
    })

    const permanentOutpost = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.PERMANENT
    })

    beforeEach(() => {
      const repository = {
        outpost: { getById: vi.fn().mockResolvedValue(permanentOutpost) },
        cell: { getById: vi.fn().mockResolvedValue(cell) },
        troop: {
          listInCell: vi.fn().mockResolvedValue([
            {
              code: TroopCode.FARMER,
              count: 10 
            },
            {
              code: TroopCode.RECYCLER,
              count: 5 
            },
          ])
        }
      } as unknown as Repository

      setRepositoryMock(repository)
    })

    it('returns same earnings_per_second as getOutpostEarningsBySecond', async () => {
      const [
        breakdown,
        earnings
      ] = await Promise.all([
        AppService.getOutpostProductionBreakdown({ outpost_id }),
        AppService.getOutpostEarningsBySecond({ outpost_id })
      ])

      expect(breakdown.earnings_per_second).toEqual(earnings)
    })

    it('exposes cell coefficients and pre-cell rates from TroopService', async () => {
      const breakdown = await AppService.getOutpostProductionBreakdown({ outpost_id })

      expect(breakdown.cell_resource_coefficient).toEqual(resource_coefficient)
      expect(breakdown.pre_cell_earnings_per_second.mushroom).toBe(TroopService.getEarningsBySecond({
        code: TroopCode.FARMER,
        count: 10,
        coefficients: NEUTRAL_CELL_COEFFICIENTS
      }))
      expect(breakdown.pre_cell_earnings_per_second.plastic).toBe(TroopService.getEarningsBySecond({
        code: TroopCode.RECYCLER,
        count: 5,
        coefficients: NEUTRAL_CELL_COEFFICIENTS
      }))
      expect(breakdown.earnings_per_second.mushroom).toBe(TroopService.getEarningsBySecond({
        code: TroopCode.FARMER,
        count: 10,
        coefficients: resource_coefficient
      }))
      expect(breakdown.earnings_per_second.plastic).toBe(TroopService.getEarningsBySecond({
        code: TroopCode.RECYCLER,
        count: 5,
        coefficients: resource_coefficient
      }))
    })

    it('returns zero earnings for temporary outposts', async () => {
      const temporaryOutpost = OutpostEntity.create({
        id: outpost_id,
        player_id,
        cell_id,
        type: OutpostType.TEMPORARY
      })
      const repository = {
        outpost: { getById: vi.fn().mockResolvedValue(temporaryOutpost) },
        cell: { getById: vi.fn().mockResolvedValue(cell) },
        troop: {
          listInCell: vi.fn().mockResolvedValue([
            {
              code: TroopCode.FARMER,
              count: 10 
            },
          ])
        }
      } as unknown as Repository
      setRepositoryMock(repository)

      const breakdown = await AppService.getOutpostProductionBreakdown({ outpost_id })
      expect(breakdown.earnings_per_second).toEqual({
        plastic: 0,
        mushroom: 0 
      })
      expect(breakdown.pre_cell_earnings_per_second).toEqual({
        plastic: 0,
        mushroom: 0 
      })
      expect(breakdown.cell_resource_coefficient).toEqual(resource_coefficient)
    })
  })
  
  describe('getExploredCellIds', () => {
    const coordinates: Coordinates = {
      x: 4,
      y: 5,
      sector: 1 
    }
    const cell = CellEntity.create({
      id: id(),
      coordinates,
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      },
      solar_coefficient: 1
    })
  
    beforeEach(() => {
      const repository = { cell: { getCell: vi.fn().mockResolvedValue(cell) } } as unknown as Repository
      setRepositoryMock(repository)
    })
  
    it('returns the cell id for the given coordinates', async () => {
      const ids = await AppService.getExploredCellIds({ coordinates })
      expect(ids).toEqual([ cell.id ])
    })
  })
  
  describe('getCityMaximumBuildingLevels', () => {
    const city_id = id()
  
    beforeEach(() => {
      const repository = { cell: { getCityCellsCount: vi.fn().mockResolvedValue(7) } } as unknown as Repository
      setRepositoryMock(repository)
    })
  
    it('delegates to CityService using city cell count from repository', async () => {
      const result = await AppService.getCityMaximumBuildingLevels({ city_id })
      expect(result).toBe(CityService.getMaximumBuildingLevels({ city_cells_count: 7 }))
    })
  })
  
  describe('getCityWarehousesCapacity', () => {
    const city_id = id()
  
    beforeEach(() => {
      const repository = {
        building: {
          getLevel: vi.fn().mockImplementation(({ code }: { code: BuildingCode }) => {
            if (code === BuildingCode.MUSHROOM_WAREHOUSE) {
              return 3
            }
            if (code === BuildingCode.PLASTIC_WAREHOUSE) {
              return 2
            }
            return 0
          })
        }
      } as unknown as Repository
      setRepositoryMock(repository)
    })
  
    it('matches BuildingService warehouse capacity for both warehouses', async () => {
      const capacity = await AppService.getCityWarehousesCapacity({ city_id })
      expect(capacity.mushroom).toBe(BuildingService.getWarehouseCapacity({
        code: BuildingCode.MUSHROOM_WAREHOUSE,
        level: 3
      }))
      expect(capacity.plastic).toBe(BuildingService.getWarehouseCapacity({
        code: BuildingCode.PLASTIC_WAREHOUSE,
        level: 2
      }))
    })
  })

  describe('getOutpostWarehousesCapacity', () => {
    const player_id = id()

    beforeEach(() => {
      const repository = {
        technology: {
          getLevel: vi.fn().mockResolvedValue(2)
        }
      } as unknown as Repository
      setRepositoryMock(repository)
    })

    it('matches OutpostService capacity for logistics technology level', async () => {
      const capacity = await AppService.getOutpostWarehousesCapacity({ player_id })
      expect(capacity).toEqual(OutpostService.getWarehousesCapacity({ logistics_level: 2 }))
    })
  })
  
  describe('getBuildingRequirementLevels', () => {
    const city_id = id()
    const player_id = id()
  
    afterEach(() => {
      vi.restoreAllMocks()
    })
  
    it('calls list with empty code lists and returns empty maps for MUSHROOM_FARM', async () => {
      const building_list = vi.fn().mockResolvedValue([])
      const technology_list = vi.fn().mockResolvedValue([])
      const repository = {
        building: { list: building_list },
        technology: { list: technology_list }
      } as unknown as Repository
      setRepositoryMock(repository)
  
      const levels = await AppService.getBuildingRequirementLevels({
        city_id,
        player_id,
        building_code: BuildingCode.MUSHROOM_FARM
      })
  
      expect(levels).toEqual({
        building: {},
        technology: {} 
      })
      expect(building_list).toHaveBeenCalledWith({
        city_id,
        codes: [] 
      })
      expect(technology_list).toHaveBeenCalledWith({
        player_id,
        codes: [] 
      })
    })
  
    it('maps CLONING_FACTORY technology requirements from repository', async () => {
      const architecture = TechnologyEntity.create({
        id: id(),
        player_id,
        code: TechnologyCode.ARCHITECTURE,
        level: 4
      })
      const building_list = vi.fn().mockResolvedValue([])
      const technology_list = vi.fn().mockResolvedValue([ architecture ])
      const repository = {
        building: { list: building_list },
        technology: { list: technology_list }
      } as unknown as Repository
      setRepositoryMock(repository)
  
      const levels = await AppService.getBuildingRequirementLevels({
        city_id,
        player_id,
        building_code: BuildingCode.CLONING_FACTORY
      })
  
      expect(levels.building).toEqual({})
      expect(levels.technology[TechnologyCode.ARCHITECTURE]).toBe(4)
      expect(technology_list).toHaveBeenCalledWith({
        player_id,
        codes: [ TechnologyCode.ARCHITECTURE ]
      })
    })
  })
  
  describe('getTechnologyRequirementLevels', () => {
    const city_id = id()
    const player_id = id()
  
    it('maps ARCHITECTURE building requirements from repository', async () => {
      const research_lab = BuildingEntity.create({
        id: id(),
        city_id,
        code: BuildingCode.RESEARCH_LAB,
        level: 6
      })
      const building_list = vi.fn().mockResolvedValue([ research_lab ])
      const technology_list = vi.fn().mockResolvedValue([])
      const repository = {
        building: { list: building_list },
        technology: { list: technology_list }
      } as unknown as Repository
      vi.spyOn(Factory, 'getRepository').mockReturnValue(repository)
  
      const levels = await AppService.getTechnologyRequirementLevels({
        city_id,
        player_id,
        technology_code: TechnologyCode.ARCHITECTURE,
        technology_level: 0
      })
  
      expect(levels.technology).toEqual({})
      expect(levels.building[BuildingCode.RESEARCH_LAB]).toBe(6)
      expect(building_list).toHaveBeenCalledWith({
        city_id,
        codes: [ BuildingCode.RESEARCH_LAB ]
      })
    })
  })
  
  describe('getTroopRequirementLevels', () => {
    const city_id = id()
    const player_id = id()
  
    it('maps EXPLORER building requirements from repository', async () => {
      const cloning = BuildingEntity.create({
        id: id(),
        city_id,
        code: BuildingCode.CLONING_FACTORY,
        level: 2
      })
      const building_list = vi.fn().mockResolvedValue([ cloning ])
      const technology_list = vi.fn().mockResolvedValue([])
      const repository = {
        building: { list: building_list },
        technology: { list: technology_list }
      } as unknown as Repository
      setRepositoryMock(repository)
  
      const levels = await AppService.getTroopRequirementLevels({
        city_id,
        player_id,
        troop_code: TroopCode.EXPLORER
      })
  
      expect(levels.technology).toEqual({})
      expect(levels.building[BuildingCode.CLONING_FACTORY]).toBe(2)
      expect(building_list).toHaveBeenCalledWith({
        city_id,
        codes: [ BuildingCode.CLONING_FACTORY ]
      })
    })
  })
  
  describe('selectCityFirstCell', () => {
    const coords_taken: Coordinates = {
      x: 10,
      y: 20,
      sector: 1 
    }
    const coords_free: Coordinates = {
      x: 11,
      y: 20,
      sector: 1 
    }
    const assigned_cell = CellEntity.create({
      id: id(),
      coordinates: coords_taken,
      type: CellType.RUINS,
      resource_coefficient: {
        plastic: 1,
        mushroom: 0.5 
      },
      solar_coefficient: 1
    }).assign({ city_id: id() })
    const free_cell = CellEntity.create({
      id: id(),
      coordinates: coords_free,
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      },
      solar_coefficient: 1
    })
  
    beforeEach(() => {
      vi.spyOn(WorldService, 'getRandomCoordinates')
        .mockReturnValueOnce(coords_taken)
        .mockReturnValueOnce(coords_free)
      const getCell = vi.fn()
        .mockResolvedValueOnce(assigned_cell)
        .mockResolvedValueOnce(free_cell)
      const repository = { cell: { getCell } } as unknown as Repository
      setRepositoryMock(repository)
    })
  
    it('skips assigned cells until an unassigned cell is found', async () => {
      const cell = await AppService.selectCityFirstCell()
      expect(cell).toBe(free_cell)
    })
  })
  
  describe('getCellsAround', () => {
    const center: Coordinates = {
      x: 5,
      y: 7,
      sector: 2 
    }
    const expected_neighbors: Coordinates[] = [
      {
        x: 4,
        y: 7,
        sector: 2 
      },
      {
        x: 5,
        y: 6,
        sector: 2 
      },
      {
        x: 6,
        y: 7,
        sector: 2 
      },
      {
        x: 5,
        y: 8,
        sector: 2 
      }
    ]
  
    beforeEach(() => {
      const getCell = vi.fn().mockImplementation(({ coordinates }: { coordinates: Coordinates }) => Promise.resolve(CellEntity.create({
        id: id(),
        coordinates,
        type: CellType.LAKE,
        resource_coefficient: {
          plastic: 1,
          mushroom: 1 
        },
        solar_coefficient: 1
      })))
      const repository = { cell: { getCell } } as unknown as Repository
      setRepositoryMock(repository)
    })
  
    it('fetches the four orthogonal neighbors', async () => {
      const repository = Factory.getRepository() as unknown as { cell: { getCell: MockInstance } }
      await AppService.getCellsAround({ coordinates: center })
  
      const calls = repository.cell.getCell.mock.calls as Array<[ { coordinates: Coordinates } ]>
      const requested = calls.map(([ call ]) => call.coordinates)
      expect(requested).toEqual(expect.arrayContaining(expected_neighbors))
      expect(requested).toHaveLength(4)
    })
  })
  
})
