import type { MockInstance } from 'vitest'
import assert from 'assert'
import { cancelQueuedDefenseBuild } from '#app/command/defense/cancel-queued'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import { id } from '#shared/identification'

describe('cancelQueuedDefenseBuild', () => {
  const player_id = id()
  let city: CityEntity
  let row: DefenseBuildQueueEntity
  let queueDelete: MockInstance
  let stockUpdateOne: MockInstance

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'walled',
      player_id,
      cell_id: id()
    })
    row = DefenseBuildQueueEntity.create({
      id: id(),
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.TURRET,
      count: 5,
      created_at: 1
    })
    queueDelete = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      defense_build_queue: {
        getById: vi.fn().mockImplementation(async () => row),
        delete: queueDelete,
      },
      resource_stock: { updateOne: stockUpdateOne },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes the waiting row for free', async () => {
    await cancelQueuedDefenseBuild({
      player_id,
      city_id: city.id,
      queue_item_id: row.id
    })

    assert.deepStrictEqual(queueDelete.mock.calls[0], [ row.id ])
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })

  it('rejects a row of another city', async () => {
    row = DefenseBuildQueueEntity.create({
      ...row,
      city_id: id()
    })
    await assert.rejects(cancelQueuedDefenseBuild({
      player_id,
      city_id: city.id,
      queue_item_id: row.id
    }), new Error(DefenseError.QUEUE_ITEM_NOT_FOUND))
  })

  it('rejects another player', async () => {
    await assert.rejects(cancelQueuedDefenseBuild({
      player_id: id(),
      city_id: city.id,
      queue_item_id: row.id
    }), new Error(CityError.NOT_OWNER))
  })
})
