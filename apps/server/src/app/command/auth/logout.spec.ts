import type { MockInstance } from 'vitest'
import { logoutAuth } from './logout'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { AuthEntity } from '#core/auth/entity'
import { AuthError } from '#core/auth/error'
import assert from 'assert'
import { id } from '#shared/identification'

describe('logoutAuth', () => {
  const token = 'token_value'
  const auth = AuthEntity.create({
    id: id(),
    player_id: id(),
    token,
    last_action_at: 100
  })

  let authGet: MockInstance
  let authDelete: MockInstance
  let repository: Pick<Repository, 'auth'>

  beforeEach(() => {
    authGet = vi.fn().mockResolvedValue(auth)
    authDelete = vi.fn().mockResolvedValue(undefined)

    repository = {
      auth: {
        get: authGet,
        delete: authDelete
      } as unknown as Repository['auth']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delete auth when token resolves', async () => {
    await logoutAuth({ token })

    assert.strictEqual(authGet.mock.calls.length, 1)
    assert.deepStrictEqual(authGet.mock.calls[0][0], { token })

    assert.strictEqual(authDelete.mock.calls.length, 1)
    assert.strictEqual(authDelete.mock.calls[0][0], auth.id)
  })

  it('should noop when auth is not found', async () => {
    authGet.mockRejectedValue(new Error(AuthError.NOT_FOUND))

    await assert.doesNotReject(() => logoutAuth({ token }))

    assert.strictEqual(authDelete.mock.calls.length, 0)
  })
})
