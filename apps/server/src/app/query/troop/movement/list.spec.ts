import { TroopMovementListQuery } from '#app/query/troop/movement/list'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { id } from '#shared/identification'

describe('TroopMovementListQuery', () => {
  const player_id = id()
  let movements: MovementEntity[]
  let repository: Pick<Repository, 'movement'>
  let getPendingTroopMovementFinish: ReturnType<typeof vi.fn>

  beforeEach(() => {
    movements = [
      MovementEntity.create({
        id: id(),
        player_id,
        action: MovementAction.EXPLORE,
        origin: {
          x: 0,
          y: 0 },
        destination: {
          x: 1,
          y: 0 } })
    ]
    repository = {
      movement: { list: vi.fn().mockResolvedValue(movements) } as unknown as Repository['movement'],
    }
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue({
      player_id,
      movement_id: movements[0].id,
      execute_at: 10_000,
      job_id: 'job-1' })
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips orphan movements without pending job or in-progress battle', async () => {
    movements.push(
      MovementEntity.create({
        id: id(),
        player_id,
        action: MovementAction.EXPLORE,
        origin: { x: 2, y: 0 },
        destination: { x: 3, y: 0 },
      }),
    )
    getPendingTroopMovementFinish = vi.fn().mockImplementation(async ({ movement_id }: { movement_id: string }) => {
      if (movement_id === movements[0].id) {
        return {
          player_id,
          movement_id,
          execute_at: 10_000,
          job_id: 'job-1',
        }
      }
      return null
    })
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)

    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].movement.id).toBe(movements[0].id)
  })

  it('excludes attack movements once the finish job is consumed (battle in progress)', async () => {
    const attack_movement = MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.ATTACK,
      origin: { x: 0, y: 1 },
      destination: { x: 1, y: 1 },
    })
    movements = [attack_movement]
    ;(repository.movement.list as MockInstance).mockResolvedValue(movements)
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue(null)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)

    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toEqual([])
  })

  it('returns movements for player with arrive_at from pending job', async () => {
    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toEqual([
      {
        movement: movements[0],
        arrive_at: 10_000 }
    ])
    expect(repository.movement.list).toHaveBeenCalledWith({ player_id })
    expect(getPendingTroopMovementFinish).toHaveBeenCalledWith({ movement_id: movements[0].id })
  })
})
