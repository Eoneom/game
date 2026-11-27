import type { MockInstance } from 'vitest'
import { TroopMovementListQuery } from '#app/query/troop/movement/list'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import {
  BattleEntity, BattleStatus 
} from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { id } from '#shared/identification'

const makeBattle = ({
  movement_id, status 
}: { movement_id: string; status: BattleStatus }) => BattleEntity.create({
  id: 'battle-id',
  movement_id,
  attacker_player_id: 'attacker-id',
  defender_player_id: 'defender-id',
  cell_id: 'cell-id',
  target_kind: BattleTargetKind.FIELD,
  target_id: null,
  attacker_strategy: CombatStrategy.BALANCED,
  defender_strategy: CombatStrategy.BALANCED,
  current_round: 1,
  status,
  winner: null,
  state_json: {
    attacker_stacks: [],
    defender_stacks: [],
    attacker_origin: {
      x: 0,
      y: 0 
    },
    cumulative_attacker_losses: [],
    cumulative_defender_losses: [],
  },
  round_summaries: [],
  started_at: 42_000,
  finished_at: null,
})

describe('TroopMovementListQuery', () => {
  const player_id = id()
  let movements: MovementEntity[]
  let troops: TroopEntity[]
  let repository: Pick<Repository, 'movement' | 'troop' | 'battle'>
  let getPendingTroopMovementFinish: ReturnType<typeof vi.fn>

  beforeEach(() => {
    movements = [
      MovementEntity.create({
        id: id(),
        player_id,
        action: MovementAction.EXPLORE,
        origin: {
          x: 0,
          y: 0 
        },
        destination: {
          x: 1,
          y: 0 
        } 
      })
    ]
    troops = [
      TroopEntity.create({
        id: id(),
        code: TroopCode.EXPLORER,
        count: 3,
        player_id,
        cell_id: null,
        movement_id: movements[0].id,
      }),
    ]
    repository = {
      movement: { list: vi.fn().mockResolvedValue(movements) } as unknown as Repository['movement'],
      troop: { listByMovementIds: vi.fn().mockImplementation(async () => troops) } as unknown as Repository['troop'],
      battle: { getByMovementId: vi.fn().mockResolvedValue(null) } as unknown as Repository['battle'],
    }
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue({
      player_id,
      movement_id: movements[0].id,
      execute_at: 10_000,
      job_id: 'job-1' 
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips orphan movements without pending job or in-progress battle', async () => {
    movements.push(MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.EXPLORE,
      origin: {
        x: 2,
        y: 0 
      },
      destination: {
        x: 3,
        y: 0 
      },
    }))
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
    expect(repository.troop.listByMovementIds).toHaveBeenCalledWith({ movement_ids: [ movements[0].id ] })
  })

  it('excludes attack movements whose finish job is consumed without a battle in progress', async () => {
    const attack_movement = MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.ATTACK,
      origin: {
        x: 0,
        y: 1 
      },
      destination: {
        x: 1,
        y: 1 
      },
    })
    movements = [ attack_movement ]
    ;(repository.movement.list as MockInstance).mockResolvedValue(movements)
    ;(repository.battle.getByMovementId as MockInstance).mockResolvedValue(makeBattle({
      movement_id: attack_movement.id,
      status: 'finished',
    }))
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue(null)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)

    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toEqual([])
  })

  it('lists an arrived attack in battle with its battle id and the battle start (slice 045)', async () => {
    const attack_movement = MovementEntity.create({
      id: id(),
      player_id,
      action: MovementAction.ATTACK,
      origin: {
        x: 0,
        y: 1 
      },
      destination: {
        x: 1,
        y: 1 
      },
      combat_strategy: CombatStrategy.BALANCED,
    })
    movements = [ attack_movement ]
    troops = [
      TroopEntity.create({
        id: id(),
        code: TroopCode.LEGIONNAIRE,
        count: 12,
        player_id,
        cell_id: null,
        movement_id: attack_movement.id,
      }),
    ]
    ;(repository.movement.list as MockInstance).mockResolvedValue(movements)
    ;(repository.battle.getByMovementId as MockInstance).mockResolvedValue(makeBattle({
      movement_id: attack_movement.id,
      status: 'in_progress',
    }))
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue(null)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)

    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toEqual([
      {
        movement: attack_movement,
        arrive_at: 42_000,
        battle_id: 'battle-id',
        troops,
      },
    ])
  })

  it('returns movements with arrive_at from the pending job and their troops', async () => {
    const other_movement_troop = TroopEntity.create({
      id: id(),
      code: TroopCode.LEGIONNAIRE,
      count: 1,
      player_id,
      cell_id: null,
      movement_id: id(),
    })
    troops = [
      ...troops,
      other_movement_troop 
    ]

    const result = await new TroopMovementListQuery().run({ player_id })

    expect(result.movements).toEqual([
      {
        movement: movements[0],
        arrive_at: 10_000,
        battle_id: null,
        troops: [ troops[0] ],
      }
    ])
    expect(repository.movement.list).toHaveBeenCalledWith({ player_id })
    expect(getPendingTroopMovementFinish).toHaveBeenCalledWith({ movement_id: movements[0].id })
    expect(repository.troop.listByMovementIds).toHaveBeenCalledTimes(1)
  })
})
