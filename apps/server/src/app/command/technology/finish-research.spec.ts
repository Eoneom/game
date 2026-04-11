import type { MockInstance } from 'vitest'
import { finishTechnologyResearch } from './finish-research'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { now } from '#shared/time'
import assert from 'assert'
import { id } from '#shared/identification'

describe('finishTechnologyResearch', () => {
  const player_id = id()
  let technology_to_finish: TechnologyEntity
  let technologyUpdateOne: MockInstance
  let repository: Pick<Repository, 'technology'>

  beforeEach(() => {
    const done_at = now()
    technology_to_finish = TechnologyEntity.create({
      ...TechnologyEntity.init({
        player_id,
        code: TechnologyCode.ARCHITECTURE
      }),
      research_at: done_at,
      research_started_at: done_at - 60_000
    })

    technologyUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      technology: {
        getResearchDone: vi.fn().mockResolvedValue(technology_to_finish),
        updateOne: technologyUpdateOne
      } as unknown as Repository['technology']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not return any update if there is no technology in progress', async () => {
    repository.technology.getResearchDone = vi.fn().mockResolvedValue(null)

    await finishTechnologyResearch({ player_id })

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should finish the technology research', async () => {
    await finishTechnologyResearch({ player_id })

    assert.ok(technology_to_finish.research_at)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 1)
    const updated_technology = technologyUpdateOne.mock.calls[0][0]
    assert.ok(updated_technology)
    assert.ok(!updated_technology.research_at)
  })
})
