import type { MockInstance } from 'vitest'
import { progressTroopRecruitment } from '#app/command/troop/progress-recruit'
import { Factory } from '#adapter/factory'
import {
  JobQueue,
  TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS
} from '#adapter/job-queue'
import { AppEventBus } from '#app/event-bus'
import { Repository } from '#app/port/repository/generic'
import { AppEvent } from '#core/events'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { now } from '#shared/time'
import assert from 'assert'
import { id } from '#shared/identification'

describe('progressTroopRecruitment', () => {
  const player_id = id()
  const other_player_id = id()
  const city_id = id()
  const cell_id = id()
  let troop: TroopEntity
  let troopUpdateOne: MockInstance
  let scheduleTroopRecruitProgress: MockInstance
  let emit: MockInstance
  let repository: Pick<Repository, 'troop'>
  let recruitment_time: number

  beforeEach(() => {
    recruitment_time = now()
    troop = TroopEntity.create({
      ...TroopEntity.init({
        player_id,
        cell_id,
        code: TroopCode.EXPLORER,
      })
    })

    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopRecruitProgress = vi.fn().mockResolvedValue('job-id')
    emit = vi.fn()

    repository = {
      troop: {
        getById: vi.fn().mockResolvedValue(troop),
        updateOne: troopUpdateOne,
      } as unknown as Repository['troop'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleTroopRecruitProgress
    } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const baseParams = () => ({
    player_id,
    city_id,
    troop_id: troop.id,
    remaining_count: 1000,
    last_progress: recruitment_time,
    finish_at: recruitment_time + 10000,
    started_at: recruitment_time,
  })

  it('should no-op when troop does not belong to player', async () => {
    const result = await progressTroopRecruitment({
      ...baseParams(),
      player_id: other_player_id,
    })

    assert.strictEqual(result.recruit_count, 0)
    assert.strictEqual(troopUpdateOne.mock.calls.length, 0)
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
  })

  it('should make recruitment progress and reschedule', async () => {
    await progressTroopRecruitment(baseParams())

    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.ok(updated_troop.count >= 0)

    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 1)
    const scheduled = scheduleTroopRecruitProgress.mock.calls[0][0]
    assert.strictEqual(scheduled.city_id, city_id)
    assert.strictEqual(scheduled.troop_id, troop.id)
    assert.strictEqual(scheduled.finish_at, recruitment_time + 10000)
    assert.ok(scheduled.execute_at <= scheduled.finish_at)
    assert.ok(
      scheduled.execute_at - recruitment_time >= TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS
      || scheduled.execute_at === scheduled.finish_at
      || scheduled.remaining_count < 1000
    )

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.TroopRecruitmentUpdated)
    assert.deepStrictEqual(emit.mock.calls[0][1], {
      city_id,
      player_id
    })
  })

  it('should finish recruitment without rescheduling when complete', async () => {
    await progressTroopRecruitment({
      ...baseParams(),
      remaining_count: 5,
      last_progress: recruitment_time - 10000,
      finish_at: recruitment_time - 1,
      started_at: recruitment_time - 10000,
    })

    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_troop.count, 5)
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.TroopRecruitmentUpdated)
  })
})
