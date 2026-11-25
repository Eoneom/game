import type { MockInstance } from 'vitest'
import { TroopMovementGetQuery } from '#app/query/troop/movement/get'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { id } from '#shared/identification'
import { BattleEntity, BattleStatus } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'

const makeBattle = ({ movement_id, status }: { movement_id: string; status: BattleStatus }) =>
  BattleEntity.create({
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
      attacker_origin: { x: 0, y: 0 },
      round_summaries: [],
      cumulative_attacker_losses: [],
      cumulative_defender_losses: [],
    },
    started_at: 42_000,
    finished_at: null,
  })

describe('TroopMovementGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const movement_id = id()
  let movement: MovementEntity
  let troops: TroopEntity[]
  let repository: Pick<Repository, 'movement' | 'troop' | 'battle'>
  let getPendingTroopMovementFinish: ReturnType<typeof vi.fn>

  beforeEach(() => {
    movement = MovementEntity.create({
      id: movement_id,
      player_id,
      action: MovementAction.EXPLORE,
      origin: {
        x: 0,
        y: 0 },
      destination: {
        x: 1,
        y: 0 } })
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
      troop: { listByMovement: vi.fn().mockResolvedValue(troops) } as unknown as Repository['troop'],
      battle: { getByMovementId: vi.fn().mockResolvedValue(null) } as unknown as Repository['battle'],
    }
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue({
      player_id,
      movement_id,
      execute_at: 99_999,
      job_id: 'job-1' })
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)
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

  it('throws not-found when finish job is gone and no battle is in progress', async () => {
    movement = MovementEntity.create({
      ...movement,
      action: MovementAction.ATTACK,
    })
    ;(repository.movement.getById as MockInstance).mockResolvedValue(movement)
    getPendingTroopMovementFinish = vi.fn().mockResolvedValue(null)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)

    await expect(new TroopMovementGetQuery().run({
      player_id,
      movement_id,
    })).rejects.toThrow(TroopError.MOVEMENT_NOT_FOUND)
  })

  it('returns movement, troops and arrive_at from pending job', async () => {
    const result = await new TroopMovementGetQuery().run({
      player_id,
      movement_id
    })

    expect(result.movement).toBe(movement)
    expect(result.troops).toBe(troops)
    expect(result.arrive_at).toBe(99_999)
    expect(result.battle_id).toBeNull()
    expect(repository.troop.listByMovement).toHaveBeenCalledWith({ movement_id })
    expect(getPendingTroopMovementFinish).toHaveBeenCalledWith({ movement_id })
    expect(repository.battle.getByMovementId).not.toHaveBeenCalled()
  })

  describe('attack movement that has arrived', () => {
    beforeEach(() => {
      movement = MovementEntity.create({
        ...movement,
        action: MovementAction.ATTACK,
      })
      ;(repository.movement.getById as MockInstance).mockResolvedValue(movement)
      getPendingTroopMovementFinish = vi.fn().mockResolvedValue(null)
      vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTroopMovementFinish } as unknown as JobQueue)
    })

    it('returns battle_id and battle start while the battle is in progress', async () => {
      ;(repository.battle.getByMovementId as MockInstance)
        .mockResolvedValue(makeBattle({ movement_id, status: 'in_progress' }))

      const result = await new TroopMovementGetQuery().run({ player_id, movement_id })

      expect(result.battle_id).toBe('battle-id')
      expect(result.arrive_at).toBe(42_000)
      expect(repository.battle.getByMovementId).toHaveBeenCalledWith(movement_id)
    })

    it('throws not-found once the battle is finished', async () => {
      ;(repository.battle.getByMovementId as MockInstance)
        .mockResolvedValue(makeBattle({ movement_id, status: 'finished' }))

      await expect(new TroopMovementGetQuery().run({ player_id, movement_id }))
        .rejects.toThrow(TroopError.MOVEMENT_NOT_FOUND)
    })
  })
})
