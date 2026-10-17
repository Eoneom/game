import { isEmpireProductionReadyForResearch } from './production'
import { BuildingListQuery } from '#query/building/list'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { id } from '#shared/identification'
import { testCityCell, testResourceStock } from '../../../test-support/resource-stock'
import assert from 'assert'

describe('isEmpireProductionReadyForResearch', () => {
  const player_id = id()
  const city = CityEntity.create({
    id: id(),
    name: 'Core I',
    player_id,
    cell_id: id(),
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when core production, energy, and warehouses are healthy', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      resource_stock: testResourceStock({
        cell_id: city.cell_id,
        plastic: 100,
        mushroom: 100,
      }),
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
      production_energy_ratio: 1,
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 2,
        },
        {
          id: id(),
          code: BuildingCode.RECYCLING_PLANT,
          level: 2,
        },
      ],
      upgrade_queue: [],
    })

    assert.strictEqual(await isEmpireProductionReadyForResearch(player_id), true)
  })

  it('returns false when the first city is under warehouse pressure', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      resource_stock: testResourceStock({
        cell_id: city.cell_id,
        plastic: 900,
        mushroom: 100,
      }),
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
      production_energy_ratio: 1,
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 2,
        },
        {
          id: id(),
          code: BuildingCode.RECYCLING_PLANT,
          level: 2,
        },
      ],
      upgrade_queue: [],
    })

    assert.strictEqual(await isEmpireProductionReadyForResearch(player_id), false)
  })
})
