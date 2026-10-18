import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { id } from '#shared/identification'

describe('resolveMovementArriveAt', () => {
  const movement_id = id()

  it('returns execute_at from pending finish job', async () => {
    const arrive_at = await resolveMovementArriveAt({
      movement_id,
      job_queue: {
        getPendingTroopMovementFinish: vi.fn().mockResolvedValue({
          movement_id,
          execute_at: 42_000,
        }),
      },
      battle_repository: {
        getByMovementId: vi.fn().mockResolvedValue(null),
      },
    })

    expect(arrive_at).toBe(42_000)
  })

  it('returns battle started_at when finish job is gone but battle is in progress', async () => {
    const battle = BattleEntity.create({
      id: id(),
      movement_id,
      attacker_player_id: id(),
      defender_player_id: id(),
      cell_id: id(),
      target_kind: BattleTargetKind.CITY,
      target_id: id(),
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 1,
      status: 'in_progress',
      winner: null,
      state_json: {
        attacker_stacks: [],
        defender_stacks: [],
        attacker_origin: { x: 0, y: 0 },
        round_summaries: [],
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [],
      },
      started_at: 50_000,
      finished_at: null,
    })

    const arrive_at = await resolveMovementArriveAt({
      movement_id,
      job_queue: {
        getPendingTroopMovementFinish: vi.fn().mockResolvedValue(null),
      },
      battle_repository: {
        getByMovementId: vi.fn().mockResolvedValue(battle),
      },
    })

    expect(arrive_at).toBe(50_000)
  })

  it('returns null when there is no pending job and no in-progress battle', async () => {
    const arrive_at = await resolveMovementArriveAt({
      movement_id,
      job_queue: {
        getPendingTroopMovementFinish: vi.fn().mockResolvedValue(null),
      },
      battle_repository: {
        getByMovementId: vi.fn().mockResolvedValue(null),
      },
    })

    expect(arrive_at).toBeNull()
  })
})
