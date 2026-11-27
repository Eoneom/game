import type { MockInstance } from 'vitest'
import assert from 'assert'
import { cancelDefenseBuild } from '#app/command/defense/cancel'
import * as start_build from '#app/command/defense/start-build'
import { Factory } from '#adapter/factory'
import {
  JobQueue, PendingDefenseBuildProgress 
} from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import * as time from '#shared/time'
import {
  testCityCell, testResourceStock
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('cancelDefenseBuild', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let pending: PendingDefenseBuildProgress | null
  let addCount: MockInstance
  let stockUpdateOne: MockInstance
  let cancelDefenseBuildProgress: MockInstance
  let processQueue: MockInstance

  beforeEach(() => {
    const city_cell = testCityCell({ cell_id })
    city = CityEntity.initCity({
      name: 'walled',
      player_id,
      cell_id: city_cell.id
    })
    pending = {
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.SHIELD_GENERATOR,
      remaining_count: 4,
      finish_at: 100_000,
      started_at: 0,
      last_progress: 0,
      execute_at: 25_000,
      job_id: 'job-id'
    }
    addCount = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    cancelDefenseBuildProgress = vi.fn().mockResolvedValue(undefined)
    processQueue = vi.spyOn(start_build, 'processDefenseBuildQueue').mockResolvedValue(undefined)
    vi.spyOn(time, 'now').mockReturnValue(50_000)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      cell: { getById: vi.fn().mockResolvedValue(city_cell) },
      defense: { addCount },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id,
          plastic: 0,
          mushroom: 0,
          plasma: 0
        })),
        updateOne: stockUpdateOne,
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingDefenseBuildProgress: vi.fn().mockImplementation(async () => pending),
      cancelDefenseBuildProgress,
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails when nothing is being built', async () => {
    pending = null
    await assert.rejects(cancelDefenseBuild({
      player_id,
      city_id: city.id
    }), new Error(DefenseError.NOT_IN_PROGRESS))
  })

  it('keeps built units, refunds the remaining ones in full and starts the next queued batch', async () => {
    await cancelDefenseBuild({
      player_id,
      city_id: city.id
    })

    assert.deepStrictEqual(addCount.mock.calls[0][0], {
      player_id,
      city_id: city.id,
      code: DefenseCode.SHIELD_GENERATOR,
      count: 2
    })
    const refunded = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(refunded.plastic, 2 * 2000)
    assert.strictEqual(refunded.mushroom, 2 * 1500)
    assert.strictEqual(refunded.plasma, 2 * 200)
    assert.strictEqual(cancelDefenseBuildProgress.mock.calls.length, 1)
    assert.strictEqual(processQueue.mock.calls.length, 1)
  })
})
