import assert from 'node:assert/strict'
import { beforeEach, describe, it, vi } from 'vitest'
import { Factory } from '#adapter/factory'
import { advanceCombatRound } from '#app/command/combat/advance-round'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopCode } from '#core/troop/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'

vi.mock('#app/command/combat/apply-battle-outcomes', () => ({
  applyBattleOutcomes: vi.fn().mockResolvedValue(undefined),
}))

describe('advanceCombatRound', () => {
  let battleUpdate: ReturnType<typeof vi.fn>
  let scheduleCombatRoundAdvance: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.mocked(applyBattleOutcomes).mockClear()
    battleUpdate = vi.fn().mockResolvedValue(undefined)
    scheduleCombatRoundAdvance = vi.fn().mockResolvedValue('job-id')

    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker-id',
      defender_player_id: 'defender-id',
      cell_id: 'cell-id',
      target_kind: BattleTargetKind.FIELD,
      target_id: null,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 0,
      status: 'in_progress',
      winner: null,
      state_json: {
        attacker_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 10 }],
        defender_stacks: [{ code: TroopCode.WAR_MACHINE, count: 1 }],
        attacker_origin: { x: 0, y: 0 },
        round_summaries: [],
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [],
      },
      started_at: 1_000,
      finished_at: null,
    })

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      battle: {
        getById: vi.fn().mockResolvedValue(battle),
        update: battleUpdate,
      },
    } as unknown as Repository)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleCombatRoundAdvance,
    } as unknown as JobQueue)
  })

  it('applies battle outcomes when a round produces a winner', async () => {
    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    assert.strictEqual(applyBattleOutcomes.mock.calls.length, 1)
    assert.deepStrictEqual(applyBattleOutcomes.mock.calls[0][0], {
      battle_id: 'battle-id',
      winner: 'attacker',
      finished_at: 5_000,
    })
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls.length, 0)
  })

  it('schedules the next round when combat continues', async () => {
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      battle: {
        getById: vi.fn().mockResolvedValue(BattleEntity.create({
          id: 'battle-id',
          movement_id: 'movement-id',
          attacker_player_id: 'attacker-id',
          defender_player_id: 'defender-id',
          cell_id: 'cell-id',
          target_kind: BattleTargetKind.FIELD,
          target_id: null,
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
          current_round: 0,
          status: 'in_progress',
          winner: null,
          state_json: {
            attacker_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 50 }],
            defender_stacks: [{ code: TroopCode.WAR_MACHINE, count: 50 }],
            attacker_origin: { x: 0, y: 0 },
            round_summaries: [],
            cumulative_attacker_losses: [],
            cumulative_defender_losses: [],
          },
          started_at: 1_000,
          finished_at: null,
        })),
        update: battleUpdate,
      },
    } as unknown as Repository)

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    assert.strictEqual(applyBattleOutcomes.mock.calls.length, 0)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls.length, 1)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls[0][0].round, 2)
  })
})
