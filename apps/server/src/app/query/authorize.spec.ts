import { AuthorizeQuery } from '#app/query/authorize'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { AuthEntity } from '#core/auth/entity'
import { id } from '#shared/identification'

describe('AuthorizeQuery', () => {
  const token = 'token_value'
  const auth = AuthEntity.create({
    id: id(),
    player_id: id(),
    token,
    last_action_at: 100
  })

  let repository: Pick<Repository, 'auth'>

  beforeEach(() => {
    repository = { auth: { get: vi.fn().mockResolvedValue(auth) } as unknown as Repository['auth'] }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns player_id from auth', async () => {
    const result = await new AuthorizeQuery().run({ token })

    expect(result.player_id).toBe(auth.player_id)
    expect(repository.auth.get).toHaveBeenCalledWith({ token })
  })
})
