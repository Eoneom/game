import type { MockInstance } from 'vitest'
import { cancelQueuedTroopRecruitment } from '#app/command/troop/cancel-queued'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import assert from 'assert'
import { id } from '#shared/identification'
import { now } from '#shared/time'

describe('cancelQueuedTroopRecruitment', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let item: TroopRecruitQueueEntity
  let queueDelete: MockInstance
  let stockUpdateOne: MockInstance
  let repository: Pick<Repository, 'city' | 'troop_recruit_queue' | 'resource_stock'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id,
      cell_id: id()
    })
    item = TroopRecruitQueueEntity.create({
      id: id(),
      player_id,
      city_id: city.id,
      troop_code: TroopCode.EXPLORER,
      count: 5,
      created_at: now()
    })
    queueDelete = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      troop_recruit_queue: {
        getById: vi.fn().mockResolvedValue(item),
        delete: queueDelete
      } as unknown as Repository['troop_recruit_queue'],
      resource_stock: { updateOne: stockUpdateOne } as unknown as Repository['resource_stock']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent cancelling queue items in another player city', async () => {
    await assert.rejects(
      () => cancelQueuedTroopRecruitment({
        player_id: other_player_id,
        city_id: city.id,
        queue_item_id: item.id
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should reject an unknown queue item', async () => {
    repository.troop_recruit_queue.getById = vi.fn().mockRejectedValue(new Error(TroopError.QUEUE_ITEM_NOT_FOUND))

    await assert.rejects(
      () => cancelQueuedTroopRecruitment({
        player_id,
        city_id: city.id,
        queue_item_id: id()
      }),
      new RegExp(TroopError.QUEUE_ITEM_NOT_FOUND)
    )
  })

  it('should reject when the queue item belongs to another city', async () => {
    repository.troop_recruit_queue.getById = vi.fn().mockResolvedValue(TroopRecruitQueueEntity.create({
      ...item,
      city_id: id()
    }))

    await assert.rejects(
      () => cancelQueuedTroopRecruitment({
        player_id,
        city_id: city.id,
        queue_item_id: item.id
      }),
      new RegExp(TroopError.QUEUE_ITEM_NOT_FOUND)
    )
    assert.strictEqual(queueDelete.mock.calls.length, 0)
  })

  it('should delete the queue item without refunding anything', async () => {
    await cancelQueuedTroopRecruitment({
      player_id,
      city_id: city.id,
      queue_item_id: item.id
    })

    assert.strictEqual(queueDelete.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls[0][0], item.id)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })
})
