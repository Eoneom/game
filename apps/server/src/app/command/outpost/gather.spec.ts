import type { MockInstance } from 'vitest'
import { outpostGather } from './gather'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { AppEvent } from '#core/events'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { OutpostType } from '#core/outpost/constant/type'
import { now } from '#shared/time'
import assert from 'assert'
import {
  testResourceStock
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'

describe('outpostGather', () => {
  const player_id = id()
  const other_player_id = id()
  const cell_id = id()
  let outpost: OutpostEntity
  let cell: CellEntity
  let stock: ReturnType<typeof testResourceStock>
  let stockUpdateOne: MockInstance
  let mockEmit: MockInstance
  let repository: Pick<Repository, 'outpost' | 'cell' | 'resource_stock'>

  beforeEach(() => {
    outpost = OutpostEntity.create({
      id: id(),
      player_id,
      cell_id,
      type: OutpostType.PERMANENT
    })
    cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 1,
        y: 1,
        sector: 1
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1
      }
    })
    stock = testResourceStock({
      cell_id,
      plastic: 100,
      mushroom: 200,
      last_plastic_gather: 0,
      last_mushroom_gather: 0
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    mockEmit = vi.fn()

    repository = {
      outpost: { getById: vi.fn().mockResolvedValue(outpost) } as unknown as Repository['outpost'],
      cell: { getById: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockImplementation(() => Promise.resolve(stock)),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: mockEmit } as any)
    vi.spyOn(AppService, 'getOutpostEarningsBySecond').mockResolvedValue({
      plastic: 100,
      mushroom: 100
    })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 2000,
      mushroom: 1500
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player to gather resource in another player outpost', async () => {
    const gather_at_time = now()

    await assert.rejects(
      () => outpostGather({
        outpost_id: outpost.id,
        player_id: other_player_id,
        gather_at_time
      }),
      new RegExp(OutpostError.NOT_OWNER)
    )
  })

  it('should skip temporary outposts', async () => {
    const temporary = OutpostEntity.create({
      id: outpost.id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY
    })
    repository.outpost.getById = vi.fn().mockResolvedValue(temporary)

    await outpostGather({
      outpost_id: outpost.id,
      player_id,
      gather_at_time: now()
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })

  it('should gather outpost resources up to capacity', async () => {
    const time_elapsed = 2
    const plastic_earnings = 100
    const mushroom_earnings = 150
    const gather_at_time = now()

    vi.spyOn(AppService, 'getOutpostEarningsBySecond').mockResolvedValue({
      plastic: plastic_earnings,
      mushroom: mushroom_earnings
    })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 2000,
      mushroom: 1500
    })

    const seeded = testResourceStock({
      cell_id,
      plastic: 100,
      mushroom: 200,
      last_plastic_gather: gather_at_time - time_elapsed * 1000,
      last_mushroom_gather: gather_at_time - time_elapsed * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await outpostGather({
      outpost_id: outpost.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 100 + time_elapsed * plastic_earnings)
    assert.strictEqual(updated_stock.mushroom, 200 + time_elapsed * mushroom_earnings)
  })

  it('should cap gather when capacity is reached', async () => {
    const gather_at_time = now()

    vi.spyOn(AppService, 'getOutpostEarningsBySecond').mockResolvedValue({
      plastic: 100,
      mushroom: 100
    })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 250,
      mushroom: 300
    })

    const seeded = testResourceStock({
      cell_id,
      plastic: 200,
      mushroom: 250,
      last_plastic_gather: gather_at_time - 2 * 1000,
      last_mushroom_gather: gather_at_time - 2 * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await outpostGather({
      outpost_id: outpost.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 250)
    assert.strictEqual(updated_stock.mushroom, 300)
  })

  it('should emit OutpostResourcesGathered event after a successful gather', async () => {
    const time_elapsed = 2
    const gather_at_time = now()

    const seeded = testResourceStock({
      cell_id,
      plastic: 100,
      mushroom: 200,
      last_plastic_gather: gather_at_time - time_elapsed * 1000,
      last_mushroom_gather: gather_at_time - time_elapsed * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    await outpostGather({
      outpost_id: outpost.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(mockEmit.mock.calls.length, 1)
    assert.strictEqual(mockEmit.mock.calls[0][0], AppEvent.OutpostResourcesGathered)
    assert.deepStrictEqual(mockEmit.mock.calls[0][1], {
      outpost_id: outpost.id,
      player_id
    })
  })

  it('should not emit event when stock is not updated (cooldown)', async () => {
    const gather_at_time = now()
    const blocked = testResourceStock({
      cell_id,
      plastic: 100,
      mushroom: 200,
      last_plastic_gather: gather_at_time + 10 * 1000,
      last_mushroom_gather: gather_at_time + 10 * 1000
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(blocked)

    await outpostGather({
      outpost_id: outpost.id,
      player_id,
      gather_at_time
    })

    assert.strictEqual(mockEmit.mock.calls.length, 0)
  })
})
