import type { MockInstance } from 'vitest'
import { authorizeAuth } from './authorize'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { AuthEntity } from '#core/auth/entity'
import { AuthError } from '#core/auth/error'
import assert from 'assert'
import { id } from '#shared/identification'

describe('authorizeAuth', () => {
  const token = 'token_value'
  const action_at = 200
  const auth_id = id()
  const player_id = id()
  const auth = AuthEntity.create({
    id: auth_id,
    player_id,
    token,
    last_action_at: 100
  })

  let authGet: MockInstance
  let authUpdateOne: MockInstance
  let repository: Pick<Repository, 'auth'>

  beforeEach(() => {
    authGet = vi.fn().mockResolvedValue(auth)
    authUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      auth: {
        get: authGet,
        updateOne: authUpdateOne
      } as unknown as Repository['auth']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reject when auth is not found', async () => {
    authGet.mockRejectedValue(new Error(AuthError.NOT_FOUND))

    await assert.rejects(
      () => authorizeAuth({
        token,
        action_at 
      }),
      new RegExp(AuthError.NOT_FOUND)
    )

    assert.strictEqual(authUpdateOne.mock.calls.length, 0)
  })

  it('should update last action and return player_id', async () => {
    const result = await authorizeAuth({
      token,
      action_at 
    })

    assert.strictEqual(authGet.mock.calls.length, 1)
    assert.deepStrictEqual(authGet.mock.calls[0][0], { token })

    assert.strictEqual(authUpdateOne.mock.calls.length, 1)
    const updated = authUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated.player_id, auth.player_id)
    assert.strictEqual(updated.last_action_at, action_at)
    assert.strictEqual(updated.id, auth.id)
    assert.strictEqual(updated.token, auth.token)

    assert.strictEqual(result.player_id, auth.player_id)
  })
})
