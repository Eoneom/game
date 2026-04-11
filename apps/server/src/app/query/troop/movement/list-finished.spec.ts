import { TroopMovementListFinishedQuery } from '#app/query/troop/movement/list-finished'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { id } from '#shared/identification'

describe('TroopMovementListFinishedQuery', () => {
  const player_id = id()
  const ids = [
    id(),
    id() 
  ]
  let repository: Pick<Repository, 'movement'>

  beforeEach(() => {
    repository = { movement: { listFinishedIds: vi.fn().mockResolvedValue(ids) } as unknown as Repository['movement'] }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns finished movement ids', async () => {
    const result = await new TroopMovementListFinishedQuery().run({ player_id })

    expect(result.movement_ids).toEqual(ids)
    expect(repository.movement.listFinishedIds).toHaveBeenCalledWith({ player_id })
  })
})
