import type { MockInstance } from 'vitest'
import { TroopMovementGetQuery } from '#app/query/troop/movement/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { id } from '#shared/identification'

describe('TroopMovementGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const movement_id = id()
  let movement: MovementEntity
  let troops: TroopEntity[]
  let repository: Pick<Repository, 'movement' | 'troop'>

  beforeEach(() => {
    movement = MovementEntity.create({
      id: movement_id,
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
      arrive_at: 99_999
    })
    troops = [
      TroopEntity.create({
        id: id(),
        code: TroopCode.EXPLORER,
        count: 1,
        player_id,
        cell_id: null,
        movement_id
      })
    ]
    repository = {
      movement: { getById: vi.fn().mockResolvedValue(movement) } as unknown as Repository['movement'],
      troop: { listByMovement: vi.fn().mockResolvedValue(troops) } as unknown as Repository['troop']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when movement is not owned by player', async () => {
    const other = MovementEntity.create({
      ...movement,
      player_id: other_player_id
    })
    ;(repository.movement.getById as MockInstance).mockResolvedValue(other)

    await expect(new TroopMovementGetQuery().run({
      player_id,
      movement_id 
    })).rejects.toThrow(TroopError.MOVEMENT_NOT_FOUND)
  })

  it('returns movement and troops', async () => {
    const result = await new TroopMovementGetQuery().run({
      player_id,
      movement_id 
    })

    expect(result.movement).toBe(movement)
    expect(result.troops).toBe(troops)
    expect(repository.troop.listByMovement).toHaveBeenCalledWith({ movement_id })
  })
})
