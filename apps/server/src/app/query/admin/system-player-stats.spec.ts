import { Factory } from '#adapter/factory'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { id } from '#shared/identification'

import { listOngoingMovementsForPlayer } from './system-player-stats'

describe('listOngoingMovementsForPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns movements with troops and skips rows without a pending finish job', async () => {
    const player_id = id()
    const movement_with_job = MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.TRANSPORT,
      origin: { x: 1, y: 2 },
      destination: { x: 3, y: 4 },
      resources: { plastic: 10, mushroom: 0, plasma: 0 },
    })
    const movement_orphan = MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.EXPLORE,
      origin: { x: 5, y: 6 },
      destination: { x: 7, y: 8 },
    })
    const arrive_at = 1_700_000_010_000

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        list: vi.fn().mockResolvedValue([ movement_with_job, movement_orphan ]),
      },
      troop: {
        listByMovement: vi.fn().mockImplementation(async ({ movement_id }: { movement_id: string }) => {
          if (movement_id !== movement_with_job.id) {
            return []
          }
          return [
            TroopEntity.create({
              id: id(),
              code: TroopCode.EXPLORER,
              count: 2,
              cell_id: null,
              player_id,
              movement_id,
            }),
          ]
        }),
      },
    } as unknown as Repository)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopMovementFinish: vi.fn().mockImplementation(async ({ movement_id }: { movement_id: string }) => {
        if (movement_id !== movement_with_job.id) {
          return null
        }
        return { execute_at: arrive_at }
      }),
    } as unknown as JobQueue)

    const movements = await listOngoingMovementsForPlayer({ player_id })

    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      id: movement_with_job.id,
      action: MovementAction.TRANSPORT,
      arrive_at,
      resources: { plastic: 10, mushroom: 0, plasma: 0 },
      troops: [{ code: TroopCode.EXPLORER, count: 2 }],
    })
  })
})
