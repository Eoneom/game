import type { MockInstance } from 'vitest'
import { cityGather } from './gather'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { now } from '#shared/time'
import assert from 'assert'
import {
  testResourceStock, testCityCell 
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('cityGather', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let stockUpdateOne: MockInstance
  let mockEmit: MockInstance
  let repository: Pick<Repository, 'city' | 'cell' | 'resource_stock'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    city_cell = testCityCell({ city_id: city.id })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: 0,
      last_mushroom_gather: 0
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    mockEmit = vi.fn()

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockImplementation(() => Promise.resolve(stock)),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: mockEmit } as any)
    vi.spyOn(AppService, 'getCityEarningsBySecond').mockResolvedValue({
      plastic: 100,
      mushroom: 100
    })
    vi.spyOn(AppService, 'getCityWarehousesCapacity').mockResolvedValue({
      plastic: 30000,
      mushroom: 30000
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player to gather resource in another player city', async () => {
    const gather_at_time = now()

    await assert.rejects(
      () => cityGather({
        city_id: city.id,
        player_id: other_player_id,
        gather_at_time
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should prevent gather if not enough time has passed', async () => {
    const gather_at_time = now()
    const blocked = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: gather_at_time + 10 * 1000,
      last_mushroom_gather: gather_at_time + 10 * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(blocked)

    await cityGather({
      city_id: city.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })

  it('should gather the maximum of what warehouses can handle', async () => {
    const time_elapsed = 2
    const plastic_earnings = 100
    const mushroom_earnings = 150
    const plastic_warehouse_capacity = STARTING_PLASTIC + 2
    const mushroom_warehouse_capacity = STARTING_MUSHROOM + 2
    const gather_at_time = now()

    vi.spyOn(AppService, 'getCityEarningsBySecond').mockResolvedValue({
      plastic: plastic_earnings,
      mushroom: mushroom_earnings
    })
    vi.spyOn(AppService, 'getCityWarehousesCapacity').mockResolvedValue({
      plastic: plastic_warehouse_capacity,
      mushroom: mushroom_warehouse_capacity
    })

    const seeded = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: gather_at_time - time_elapsed * 1000,
      last_mushroom_gather: gather_at_time - time_elapsed * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await cityGather({
      city_id: city.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, plastic_warehouse_capacity)
    assert.strictEqual(updated_stock.mushroom, mushroom_warehouse_capacity)
  })

  it('should gather city resources', async () => {
    const time_elapsed = 2
    const plastic_earnings = 100
    const mushroom_earnings = 150
    const gather_at_time = now()

    vi.spyOn(AppService, 'getCityEarningsBySecond').mockResolvedValue({
      plastic: plastic_earnings,
      mushroom: mushroom_earnings
    })

    const seeded = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: gather_at_time - time_elapsed * 1000,
      last_mushroom_gather: gather_at_time - time_elapsed * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await cityGather({
      city_id: city.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, STARTING_PLASTIC + time_elapsed * plastic_earnings)
    assert.strictEqual(updated_stock.mushroom, STARTING_MUSHROOM + time_elapsed * mushroom_earnings)
  })

  it('should emit CityResourcesGathered event after a successful gather', async () => {
    const time_elapsed = 2
    const gather_at_time = now()

    const seeded = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: gather_at_time - time_elapsed * 1000,
      last_mushroom_gather: gather_at_time - time_elapsed * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await cityGather({
      city_id: city.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(mockEmit.mock.calls.length, 1)
    assert.strictEqual(mockEmit.mock.calls[0][0], AppEvent.CityResourcesGathered)
    assert.deepStrictEqual(mockEmit.mock.calls[0][1], {
      city_id: city.id,
      player_id 
    })
  })

  it('should not emit event when stock is not updated (cooldown)', async () => {
    const gather_at_time = now()
    const blocked = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      last_plastic_gather: gather_at_time + 10 * 1000,
      last_mushroom_gather: gather_at_time + 10 * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(blocked)

    await cityGather({
      city_id: city.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(mockEmit.mock.calls.length, 0)
  })
})
