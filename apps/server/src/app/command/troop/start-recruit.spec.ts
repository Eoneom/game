import type { MockInstance } from 'vitest'
import { processTroopRecruitQueue } from '#app/command/troop/start-recruit'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import assert from 'assert'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('processTroopRecruitQueue', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let queue_rows: TroopRecruitQueueEntity[]
  let stockUpdateOne: MockInstance
  let scheduleTroopRecruitProgress: MockInstance
  let emit: MockInstance
  let queueDelete: MockInstance

  function queueRow(count: number, created_at: number): TroopRecruitQueueEntity {
    return TroopRecruitQueueEntity.create({
      id: id(),
      player_id,
      city_id: city.id,
      troop_code: TroopCode.EXPLORER,
      count,
      created_at
    })
  }

  beforeEach(() => {
    const city_cell = testCityCell({ cell_id })
    city = CityEntity.initCity({
      name: 'dummy',
      player_id,
      cell_id: city_cell.id
    })
    queue_rows = []
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopRecruitProgress = vi.fn().mockResolvedValue('job-id')
    emit = vi.fn()
    queueDelete = vi.fn().mockImplementation(async (row_id: string) => {
      queue_rows = queue_rows.filter(row => row.id !== row_id)
    })

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      cell: { getById: vi.fn().mockResolvedValue(city_cell) },
      building: { getLevel: vi.fn().mockResolvedValue(0) },
      technology: { getLevel: vi.fn().mockResolvedValue(0) },
      troop: {
        getInCell: vi.fn().mockResolvedValue(TroopEntity.init({
          player_id,
          cell_id,
          code: TroopCode.EXPLORER,
        }))
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id,
          plastic: 1000,
          mushroom: 1000,
          plasma: 0
        })),
        updateOne: stockUpdateOne,
      },
      troop_recruit_queue: {
        listByCity: vi.fn().mockImplementation(async () => [ ...queue_rows ]),
        delete: queueDelete,
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopRecruitProgress } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    vi.spyOn(AppService, 'getTroopRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.CLONING_FACTORY]: 1 },
      technology: {},
    })
    // Price scales with count so a large batch is unaffordable while a small one is not.
    vi.spyOn(PricingService, 'getTroopCost').mockImplementation(({ count }) => ({
      code: TroopCode.EXPLORER,
      resource: {
        plastic: count * 100,
        mushroom: count * 100,
        plasma: 0
      },
      duration: count * 10
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the player own stack only, never an allied reinforcement of the same code (slice 033)', async () => {
    queue_rows = [ queueRow(2, 1) ]
    const getInCell = vi.fn(async ({ player_id: owner_id }: { player_id: string }) => TroopEntity.init({
      player_id: owner_id,
      cell_id,
      code: TroopCode.EXPLORER,
    }))
    const repository = Factory.getRepository()
    repository.troop = { getInCell } as unknown as Repository['troop']

    await processTroopRecruitQueue({
      player_id,
      city_id: city.id,
      started_at: 10_000
    })

    expect(getInCell).toHaveBeenCalledWith({
      cell_id,
      player_id,
      code: TroopCode.EXPLORER
    })
    const scheduled = scheduleTroopRecruitProgress.mock.calls[0][0]
    const troop = await getInCell.mock.results[0].value
    assert.strictEqual(troop.player_id, player_id)
    assert.ok(scheduled)
  })

  it('should do nothing when the queue is empty', async () => {
    await processTroopRecruitQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })

  it('should pay for and start the oldest batch only', async () => {
    queue_rows = [
      queueRow(2, 1),
      queueRow(3, 2)
    ]

    await processTroopRecruitQueue({
      player_id,
      city_id: city.id,
      started_at: 10_000
    })

    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 1)
    const scheduled = scheduleTroopRecruitProgress.mock.calls[0][0]
    assert.strictEqual(scheduled.remaining_count, 2)
    assert.strictEqual(scheduled.started_at, 10_000)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 800)
    assert.deepStrictEqual(queue_rows.map(row => row.count), [ 3 ])
    assert.strictEqual(emit.mock.calls.length, 0)
  })

  it('should drop an unaffordable batch, emit the event and start the next one', async () => {
    const unaffordable = queueRow(50, 1)
    queue_rows = [
      unaffordable,
      queueRow(4, 2)
    ]

    await processTroopRecruitQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.TroopQueueItemDropped)
    assert.deepStrictEqual(emit.mock.calls[0][1], {
      player_id,
      city_id: city.id,
      troop_code: TroopCode.EXPLORER,
      error_code: CityError.NOT_ENOUGH_RESOURCES
    })
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 1)
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls[0][0].remaining_count, 4)
    assert.deepStrictEqual(queue_rows, [])
  })

  it('should drop a batch whose requirements are no longer met', async () => {
    vi.spyOn(AppService, 'getTroopRequirementLevels').mockResolvedValue({
      building: {},
      technology: {},
    })
    queue_rows = [ queueRow(1, 1) ]

    await processTroopRecruitQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(emit.mock.calls[0][0], AppEvent.TroopQueueItemDropped)
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.deepStrictEqual(queue_rows, [])
  })
})
