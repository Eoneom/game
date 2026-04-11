import { TroopMovementListQuery } from '#app/query/troop/movement/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { id } from '#shared/identification'

describe('TroopMovementListQuery', () => {
  const player_id = id()
  let movements: MovementEntity[]
  let repository: Pick<Repository, 'movement'>

  beforeEach(() => {
    movements = [
      MovementEntity.create({
        id: id(),
        player_id,
        action: MovementAction.EXPLORE,
        origin: {
          x: 0,
          y: 0,
          sector: 1 
        },
        destination: {
          x: 1,
          y: 0,
          sector: 1 
        },
        arrive_at: 10_000
      })
    ]
    repository = { movement: { list: vi.fn().mockResolvedValue(movements) } as unknown as Repository['movement'] }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns movements for player', async () => {
    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toBe(movements)
    expect(repository.movement.list).toHaveBeenCalledWith({ player_id })
  })
})
