import type { MockInstance } from 'vitest'
import { cancelTechnology } from './cancel'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { TechnologyError } from '#core/technology/error'
import { now } from '#shared/time'
import assert from 'assert'
import { id } from '#shared/identification'

describe('cancelTechnology', () => {
  const player_id = id()
  let technology: TechnologyEntity
  let technologyUpdateOne: MockInstance
  let repository: Pick<Repository, 'technology'>

  beforeEach(() => {
    const started = now()
    technology = TechnologyEntity.create({
      ...TechnologyEntity.init({
        player_id,
        code: TechnologyCode.ARCHITECTURE
      }),
      research_at: started + 1000 * 60,
      research_started_at: started
    })

    technologyUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      technology: {
        getInProgress: vi.fn().mockResolvedValue(technology),
        updateOne: technologyUpdateOne
      } as unknown as Repository['technology']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should assert that there is a technology in progress', async () => {
    repository.technology.getInProgress = vi.fn().mockResolvedValue(null)

    await assert.rejects(
      () => cancelTechnology({ player_id }),
      new RegExp(TechnologyError.NOT_IN_PROGRESS)
    )

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should cancel technology', async () => {
    await cancelTechnology({ player_id })

    assert.ok(technology.research_at)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 1)
    const updated_technology = technologyUpdateOne.mock.calls[0][0]
    assert.ok(!updated_technology.research_at)
  })
})
