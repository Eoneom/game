import type { MockInstance } from 'vitest'
import assert from 'assert'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { outpostSetPermanent } from '#app/command/outpost/set-permanent'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { id } from '#shared/identification'

describe('outpostSetPermanent', () => {
  const outpost_id = id()
  const player_id = id()
  const other_player_id = id()
  const cell_id = id()

  let updateOne: MockInstance
  let getById: MockInstance
  let repository: Pick<Repository, 'outpost'>

  beforeEach(() => {
    updateOne = vi.fn().mockResolvedValue(undefined)
    getById = vi.fn().mockResolvedValue(OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY
    }))

    repository = {
      outpost: {
        getById,
        updateOne
      } as unknown as Repository['outpost']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reject when player does not own outpost', async () => {
    getById.mockResolvedValue(OutpostEntity.create({
      id: outpost_id,
      player_id: other_player_id,
      cell_id,
      type: OutpostType.TEMPORARY
    }))

    await assert.rejects(
      () => outpostSetPermanent({
        outpost_id,
        player_id 
      }),
      new RegExp(OutpostError.NOT_OWNER)
    )
  })

  it('should update outpost type to permanent', async () => {
    await outpostSetPermanent({
      outpost_id,
      player_id 
    })

    assert.strictEqual(updateOne.mock.calls.length, 1)
    assert.strictEqual(updateOne.mock.calls[0][0].type, OutpostType.PERMANENT)
  })

  it('should no-op when outpost is already permanent', async () => {
    getById.mockResolvedValue(OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.PERMANENT
    }))

    await outpostSetPermanent({
      outpost_id,
      player_id 
    })

    assert.strictEqual(updateOne.mock.calls.length, 0)
  })
})
