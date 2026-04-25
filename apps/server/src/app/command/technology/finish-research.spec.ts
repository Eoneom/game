import type { MockInstance } from 'vitest'
import { finishTechnologyResearch } from './finish-research'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { AppEvent } from '#core/events'
import { AppEventBus } from '#app/event-bus'
import assert from 'assert'
import { id } from '#shared/identification'

describe('finishTechnologyResearch', () => {
  const player_id = id()
  let technology_to_finish: TechnologyEntity
  let technologyUpdateOne: MockInstance
  let emit: MockInstance
  let repository: Pick<Repository, 'technology'>

  beforeEach(() => {
    technology_to_finish = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 0,
    })

    technologyUpdateOne = vi.fn().mockResolvedValue(undefined)
    emit = vi.fn()

    repository = {
      technology: {
        getById: vi.fn().mockResolvedValue(technology_to_finish),
        updateOne: technologyUpdateOne
      } as unknown as Repository['technology']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not update when technology level does not match the job', async () => {
    await finishTechnologyResearch({
      player_id,
      technology_id: technology_to_finish.id,
      level: 1,
    })

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
    assert.strictEqual(emit.mock.calls.length, 0)
  })

  it('should not update when technology belongs to another player', async () => {
    await finishTechnologyResearch({
      player_id: id(),
      technology_id: technology_to_finish.id,
      level: 0,
    })

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
    assert.strictEqual(emit.mock.calls.length, 0)
  })

  it('should finish the technology research', async () => {
    await finishTechnologyResearch({
      player_id,
      technology_id: technology_to_finish.id,
      level: 0,
    })

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 1)
    const updated_technology = technologyUpdateOne.mock.calls[0][0]
    assert.ok(updated_technology)
    assert.strictEqual(updated_technology.level, 1)
    assert.deepStrictEqual(emit.mock.calls[0], [
      AppEvent.TechnologyResearchFinished,
      { player_id }
    ])
  })
})
