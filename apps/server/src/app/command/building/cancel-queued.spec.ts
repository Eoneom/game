import type { MockInstance } from 'vitest'
import { cancelQueuedBuildingUpgrade } from '#app/command/building/cancel-queued'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingError } from '#core/building/error'
import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import assert from 'assert'
import { id } from '#shared/identification'
import { now } from '#shared/time'

describe('cancelQueuedBuildingUpgrade', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let other_city: CityEntity
  let item: BuildingUpgradeQueueEntity
  let queueDelete: MockInstance
  let repository: Pick<Repository, 'city' | 'building_upgrade_queue'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    other_city = CityEntity.initCity({
      name: 'other',
      player_id: other_player_id
    })
    item = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.MUSHROOM_FARM,
      created_at: now()
    })
    queueDelete = vi.fn().mockResolvedValue(undefined)

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      building_upgrade_queue: {
        getById: vi.fn().mockResolvedValue(item),
        delete: queueDelete
      } as unknown as Repository['building_upgrade_queue']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent cancelling queue items in another player city', async () => {
    await assert.rejects(
      () => cancelQueuedBuildingUpgrade({
        player_id: other_player_id,
        city_id: city.id,
        queue_item_id: item.id
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should reject when queue item belongs to another city', async () => {
    const foreign = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: other_city.id,
      building_code: BuildingCode.MUSHROOM_FARM,
      created_at: now()
    })
    repository.building_upgrade_queue.getById = vi.fn().mockResolvedValue(foreign)

    await assert.rejects(
      () => cancelQueuedBuildingUpgrade({
        player_id,
        city_id: city.id,
        queue_item_id: foreign.id
      }),
      new RegExp(BuildingError.QUEUE_ITEM_NOT_FOUND)
    )
  })

  it('should delete the queue item', async () => {
    await cancelQueuedBuildingUpgrade({
      player_id,
      city_id: city.id,
      queue_item_id: item.id
    })

    assert.strictEqual(queueDelete.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls[0][0], item.id)
  })
})
