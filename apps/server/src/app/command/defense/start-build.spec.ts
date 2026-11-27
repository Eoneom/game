import type { MockInstance } from 'vitest'
import assert from 'assert'
import { processDefenseBuildQueue } from '#app/command/defense/start-build'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { AppEvent } from '#core/events'
import { RequirementError } from '#core/requirement/error'
import {
  testCityCell, testResourceStock
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('processDefenseBuildQueue', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let queue_rows: DefenseBuildQueueEntity[]
  let stockUpdateOne: MockInstance
  let scheduleDefenseBuildProgress: MockInstance
  let emit: MockInstance

  function queueRow(code: DefenseCode, count: number, created_at: number): DefenseBuildQueueEntity {
    return DefenseBuildQueueEntity.create({
      id: id(),
      player_id,
      city_id: city.id,
      defense_code: code,
      count,
      created_at
    })
  }

  beforeEach(() => {
    const city_cell = testCityCell({ cell_id })
    city = CityEntity.initCity({
      name: 'walled',
      player_id,
      cell_id: city_cell.id
    })
    queue_rows = []
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleDefenseBuildProgress = vi.fn().mockResolvedValue('job-id')
    emit = vi.fn()

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      cell: { getById: vi.fn().mockResolvedValue(city_cell) },
      building: { getLevel: vi.fn().mockResolvedValue(2) },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id,
          plastic: 5_000,
          mushroom: 5_000,
          plasma: 0
        })),
        updateOne: stockUpdateOne,
      },
      defense_build_queue: {
        listByCity: vi.fn().mockImplementation(async () => [ ...queue_rows ]),
        delete: vi.fn().mockImplementation(async (row_id: string) => {
          queue_rows = queue_rows.filter(row => row.id !== row_id)
        }),
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleDefenseBuildProgress } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    vi.spyOn(AppService, 'getDefenseRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.CITY_WALL]: 2 },
      technology: {},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when the queue is empty', async () => {
    await processDefenseBuildQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
  })

  it('pays for and starts the oldest batch only', async () => {
    queue_rows = [
      queueRow(DefenseCode.RAMPART, 2, 1),
      queueRow(DefenseCode.MINEFIELD, 3, 2)
    ]

    await processDefenseBuildQueue({
      player_id,
      city_id: city.id,
      started_at: 10_000
    })

    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 1)
    const scheduled = scheduleDefenseBuildProgress.mock.calls[0][0]
    assert.strictEqual(scheduled.defense_code, DefenseCode.RAMPART)
    assert.strictEqual(scheduled.remaining_count, 2)
    assert.strictEqual(scheduled.started_at, 10_000)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 5_000 - 1_600)
    assert.deepStrictEqual(queue_rows.map(row => row.defense_code), [ DefenseCode.MINEFIELD ])
  })

  it('drops an unaffordable batch, emits defense:queue-item-dropped and starts the next one', async () => {
    queue_rows = [
      queueRow(DefenseCode.RAMPART, 50, 1),
      queueRow(DefenseCode.MINEFIELD, 4, 2)
    ]

    await processDefenseBuildQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(emit.mock.calls[0][0], AppEvent.DefenseQueueItemDropped)
    assert.deepStrictEqual(emit.mock.calls[0][1], {
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.RAMPART,
      error_code: CityError.NOT_ENOUGH_RESOURCES
    })
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.MINEFIELD)
    assert.deepStrictEqual(queue_rows, [])
  })

  it('drops a batch whose requirements are not met at start', async () => {
    queue_rows = [ queueRow(DefenseCode.TURRET, 1, 1) ]

    await processDefenseBuildQueue({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(emit.mock.calls[0][1].error_code, RequirementError.TECHNOLOGY_NOT_FULFILLED)
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.deepStrictEqual(queue_rows, [])
  })
})
