import type { MockInstance } from 'vitest'
import { loginAuth } from './login'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'
import assert from 'assert'
import { id } from '#shared/identification'

describe('loginAuth', () => {
  const player_name = 'player_name'
  const player_id = id()
  const player = PlayerEntity.create({
    id: player_id,
    name: player_name 
  })

  let getByName: MockInstance
  let authCreate: MockInstance
  let repository: Pick<Repository, 'player' | 'auth'>

  beforeEach(() => {
    getByName = vi.fn().mockResolvedValue(player)
    authCreate = vi.fn().mockResolvedValue(undefined)

    repository = {
      player: { getByName } as unknown as Repository['player'],
      auth: { create: authCreate } as unknown as Repository['auth']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reject when player is not found', async () => {
    getByName.mockRejectedValue(new Error(PlayerError.NOT_FOUND))

    await assert.rejects(
      () => loginAuth({ player_name }),
      new RegExp(PlayerError.NOT_FOUND)
    )

    assert.strictEqual(authCreate.mock.calls.length, 0)
  })

  it('should create auth for the player and return its token', async () => {
    const result = await loginAuth({ player_name })

    assert.strictEqual(getByName.mock.calls.length, 1)
    assert.strictEqual(getByName.mock.calls[0][0], player_name)

    assert.strictEqual(authCreate.mock.calls.length, 1)
    const created_auth = authCreate.mock.calls[0][0]
    assert.strictEqual(created_auth.player_id, player.id)
    assert.strictEqual(result.token, created_auth.token)
  })
})
