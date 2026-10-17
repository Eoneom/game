import type { MockInstance } from 'vitest'
import { cancelQueuedTechnologyResearch } from './cancel-queued'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyError } from '#core/technology/error'
import { TechnologyResearchQueueEntity } from '#core/technology/research-queue-entity'
import assert from 'assert'
import { id } from '#shared/identification'
import { now } from '#shared/time'

describe('cancelQueuedTechnologyResearch', () => {
  const player_id = id()
  let repository: Pick<Repository, 'technology_research_queue'>
  let queueDelete: MockInstance

  beforeEach(() => {
    queueDelete = vi.fn().mockResolvedValue(undefined)
    repository = {
      technology_research_queue: {
        getById: vi.fn(),
        delete: queueDelete
      } as unknown as Repository['technology_research_queue']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects foreign queue items', async () => {
    const item = TechnologyResearchQueueEntity.create({
      id: id(),
      player_id: id(),
      city_id: id(),
      technology_code: TechnologyCode.ARCHITECTURE,
      created_at: now()
    })
    repository.technology_research_queue.getById = vi.fn().mockResolvedValue(item)

    await assert.rejects(
      () => cancelQueuedTechnologyResearch({
        player_id,
        queue_item_id: item.id
      }),
      new RegExp(TechnologyError.QUEUE_ITEM_NOT_FOUND)
    )
  })

  it('deletes owned queue items', async () => {
    const item = TechnologyResearchQueueEntity.create({
      id: id(),
      player_id,
      city_id: id(),
      technology_code: TechnologyCode.ARCHITECTURE,
      created_at: now()
    })
    repository.technology_research_queue.getById = vi.fn().mockResolvedValue(item)

    await cancelQueuedTechnologyResearch({
      player_id,
      queue_item_id: item.id
    })

    assert.strictEqual(queueDelete.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls[0][0], item.id)
  })
})
