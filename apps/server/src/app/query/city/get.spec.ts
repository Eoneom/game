import { CityGetQuery } from '#app/query/city/get'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import * as time from '#shared/time'
import { testResourceStock } from '../../test-support/resource-stock'
import type { MockInstance } from 'vitest'
import { id } from '#shared/identification'

describe('CityGetQuery', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let cell: CellEntity
  let repository: Pick<Repository, 'building' | 'city' | 'cell' | 'resource_stock'>
  let nowSpy: MockInstance

  beforeEach(() => {
    nowSpy = vi.spyOn(time, 'now').mockReturnValue(0)
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 1,
        y: 2,
        sector: 3 
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      },
      city_id: city.id
    })

    repository = {
      building: { getTotalLevels: vi.fn().mockResolvedValue(7) } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: { getCityCell: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id: cell.id,
          plastic: 0,
          mushroom: 0 
        })),
      } as unknown as Repository['resource_stock'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getCityProductionBreakdown').mockResolvedValue({
      earnings_per_second: {
        plastic: 1,
        mushroom: 2 
      },
      pre_cell_earnings_per_second: {
        plastic: 1,
        mushroom: 2 
      },
      cell_resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      }
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
})
