import type { MockInstance } from 'vitest'
import { cancelTechnology } from './cancel'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { TechnologyError } from '#core/technology/error'
import assert from 'assert'
import { id } from '#shared/identification'

describe('cancelTechnology', () => {
  const player_id = id()
  let getPendingTechnologyResearch: MockInstance
  let cancelTechnologyResearchFinish: MockInstance

  beforeEach(() => {
    getPendingTechnologyResearch = vi.fn().mockResolvedValue({
      player_id,
      city_id: id(),
      technology_id: id(),
      level: 0,
      execute_at: Date.now() + 60_000,
      job_id: 'job'
    })
    cancelTechnologyResearchFinish = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTechnologyResearch,
      cancelTechnologyResearchFinish
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should assert that there is a technology in progress', async () => {
    getPendingTechnologyResearch.mockResolvedValue(null)

    await assert.rejects(
      () => cancelTechnology({ player_id }),
      new RegExp(TechnologyError.NOT_IN_PROGRESS)
    )

    assert.strictEqual(cancelTechnologyResearchFinish.mock.calls.length, 0)
  })

  it('should cancel technology research job', async () => {
    await cancelTechnology({ player_id })

    assert.strictEqual(cancelTechnologyResearchFinish.mock.calls.length, 1)
    assert.deepStrictEqual(cancelTechnologyResearchFinish.mock.calls[0][0], { player_id })
  })
})
