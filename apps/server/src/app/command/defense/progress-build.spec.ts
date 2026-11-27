import type { MockInstance } from 'vitest'
import assert from 'assert'
import { progressDefenseBuild } from '#app/command/defense/progress-build'
import * as start_build from '#app/command/defense/start-build'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { DefenseCode } from '#core/defense/constant/code'
import { AppEvent } from '#core/events'
import * as time from '#shared/time'
import { id } from '#shared/identification'

describe('progressDefenseBuild', () => {
  const player_id = id()
  let city: CityEntity
  let addCount: MockInstance
  let scheduleDefenseBuildProgress: MockInstance
  let emit: MockInstance
  let processQueue: MockInstance

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'walled',
      player_id,
      cell_id: id()
    })
    addCount = vi.fn().mockResolvedValue(undefined)
    scheduleDefenseBuildProgress = vi.fn().mockResolvedValue('job-id')
    emit = vi.fn()
    processQueue = vi.spyOn(start_build, 'processDefenseBuildQueue').mockResolvedValue(undefined)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      building: { getLevel: vi.fn().mockResolvedValue(0) },
      defense: { addCount },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleDefenseBuildProgress } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds the units built so far and schedules the rest', async () => {
    vi.spyOn(time, 'now').mockReturnValue(50_000)

    const { built_count } = await progressDefenseBuild({
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.RAMPART,
      remaining_count: 10,
      finish_at: 100_000,
      started_at: 0,
      last_progress: 0,
    })

    assert.strictEqual(built_count, 5)
    assert.deepStrictEqual(addCount.mock.calls[0][0], {
      player_id,
      city_id: city.id,
      code: DefenseCode.RAMPART,
      count: 5
    })
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].remaining_count, 5)
    assert.strictEqual(processQueue.mock.calls.length, 0)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.DefenseBuildUpdated)
  })

  it('finishes the batch and starts the next queued one', async () => {
    vi.spyOn(time, 'now').mockReturnValue(200_000)

    const { built_count } = await progressDefenseBuild({
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.TURRET,
      remaining_count: 3,
      finish_at: 100_000,
      started_at: 0,
      last_progress: 0,
    })

    assert.strictEqual(built_count, 3)
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
    assert.strictEqual(processQueue.mock.calls.length, 1)
  })

  it('does nothing once the city changed hands', async () => {
    vi.spyOn(time, 'now').mockReturnValue(200_000)

    const { built_count } = await progressDefenseBuild({
      player_id: id(),
      city_id: city.id,
      defense_code: DefenseCode.TURRET,
      remaining_count: 3,
      finish_at: 100_000,
      started_at: 0,
      last_progress: 0,
    })

    assert.strictEqual(built_count, 0)
    assert.strictEqual(addCount.mock.calls.length, 0)
    assert.strictEqual(processQueue.mock.calls.length, 0)
  })
})
