import { CityGetQuery } from '#app/query/city/get'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import * as time from '#shared/time'
import { testResourceStock } from '../../test-support/resource-stock'
import type { MockInstance } from 'vitest'
import { id } from '#shared/identification'

describe('CityGetQuery', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let cell: CellEntity
  let repository: Pick<Repository, 'building' | 'city' | 'cell' | 'resource_stock' | 'technology'>
  let nowSpy: MockInstance

  beforeEach(() => {
    nowSpy = vi.spyOn(time, 'now').mockReturnValue(0)
    cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 1,
        y: 2 },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1
      },
      solar_coefficient: 1
    })
    city = CityEntity.initCity({
      name: 'dummy',
      player_id,
      cell_id: cell.id
    })

    repository = {
      building: {
        getTotalLevels: vi.fn().mockResolvedValue(7),
        getLevel: vi.fn().mockResolvedValue(2) } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: { getById: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id: cell.id,
          plastic: 0,
          mushroom: 0,
          plasma: 0
        })) } as unknown as Repository['resource_stock'],
      technology: {
        get: vi.fn().mockResolvedValue(TechnologyEntity.create({
          id: id(),
          player_id,
          code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
          level: 0
        }))
      } as unknown as Repository['technology'] }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getCityProductionBreakdown').mockResolvedValue({
      earnings_per_second: {
        plastic: 1,
        mushroom: 2 ,
        plasma: 0
      },
      pre_cell_earnings_per_second: {
        plastic: 1,
        mushroom: 2 ,
        plasma: 0
      },
      cell_resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1
      },
      production_energy_ratio: 1
    })
    vi.spyOn(AppService, 'getCityEnergyConsumptionBreakdown').mockResolvedValue({
      energy_consumption: 4,
      non_production_consumption: 0,
      production_consumption: 4,
      production_energy_ratio: 1,
      energy_supply: 15
    })
    vi.spyOn(AppService, 'getCityMaximumBuildingLevels').mockResolvedValue(42)
    vi.spyOn(AppService, 'getCityWarehousesCapacity').mockResolvedValue({
      plastic: 100,
      mushroom: 100
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns building_levels_used from getTotalLevels', async () => {
    const result = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })

    expect(result.building_levels_used).toBe(7)
    expect(result.maximum_building_levels).toBe(42)
    expect(repository.building.getTotalLevels).toHaveBeenCalledWith({ city_id: city.id })
  })

  it('returns warehouse_full_in_seconds after 50s of accrual', async () => {
    nowSpy.mockReturnValue(50_000)

    const result = await new CityGetQuery().run({
      city_id: city.id,
      player_id 
    })

    expect(result.warehouse_full_in_seconds).toEqual({
      plastic: 50,
      mushroom: 0
    })
  })

  it('returns energy from solar panel level', async () => {
    const result = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })

    expect(result.energy).toBe(15)
    expect(result.pre_cell_energy).toBe(15)
    expect(result.neutral_photovoltaic_energy).toBe(15)
    expect(result.photovoltaic_optimization_level).toBe(0)
    expect(result.cell_solar_coefficient).toBe(1)
    expect(result.energy_consumption).toBe(4)
    expect(result.production_energy_ratio).toBe(1)
  })

  it('returns boosted energy when photovoltaic optimization is researched', async () => {
    ;(repository.technology.get as MockInstance).mockResolvedValue(TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      level: 1
    }))

    const result = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })

    expect(result.energy).toBe(17)
    expect(result.pre_cell_energy).toBe(17)
    expect(result.neutral_photovoltaic_energy).toBe(15)
    expect(result.photovoltaic_optimization_level).toBe(1)
  })
})
