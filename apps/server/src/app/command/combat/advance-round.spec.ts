import assert from 'node:assert/strict'
import { beforeEach, describe, it, vi } from 'vitest'
import { Factory } from '#adapter/factory'
import { advanceCombatRound } from '#app/command/combat/advance-round'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { COMBAT_ROUND_INTERVAL_MS } from '#app/scheduling/intervals'
import { CombatService } from '#core/combat/combat-service'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopCode } from '#core/troop/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { AppEvent } from '#core/events'
import { AppEventBus } from '#app/event-bus'

vi.mock('#app/command/combat/apply-battle-outcomes', () => ({
  applyBattleOutcomes: vi.fn().mockResolvedValue({
    attacker_player_id: 'attacker-id',
    defender_player_id: 'defender-id',
    attacker_report_id: 'attacker-report-id',
    defender_report_id: 'defender-report-id',
  }),
}))

describe('advanceCombatRound', () => {
  let battleUpdate: ReturnType<typeof vi.fn>
  let scheduleCombatRoundAdvance: ReturnType<typeof vi.fn>
  let emit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.mocked(applyBattleOutcomes).mockClear()
    emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
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
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [],
      },
      round_summaries: [],
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
    const updated = battleUpdate.mock.calls[0][0]
    assert.strictEqual(updated.current_round, 1)
    assert.deepStrictEqual(updated.round_summaries.map((r: { round: number }) => r.round), [1])
    assert.strictEqual('round_summaries' in updated.state_json, false)
    assert.strictEqual(emit.mock.calls.length, 2)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.BattleFinished)
    assert.deepStrictEqual(emit.mock.calls[0][1], {
      player_id: 'attacker-id',
      report_id: 'attacker-report-id',
      perspective: 'attacker',
      winner: 'attacker',
    })
    assert.strictEqual(emit.mock.calls[1][0], AppEvent.BattleFinished)
    assert.deepStrictEqual(emit.mock.calls[1][1], {
      player_id: 'defender-id',
      report_id: 'defender-report-id',
      perspective: 'defender',
      winner: 'attacker',
    })
  })

  it('emits BattleFinished only after the advance-round transaction completes', async () => {
    let inside_transaction = false
    let emit_while_in_transaction = false
    emit.mockImplementation(() => {
      if (inside_transaction) {
        emit_while_in_transaction = true
      }
    })
    const runInTransaction = vi.spyOn(Factory, 'runInTransaction').mockImplementation(async (fn) => {
      inside_transaction = true
      const result = await fn()
      inside_transaction = false
      return result
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    assert.strictEqual(emit.mock.calls.length, 2)
    assert.strictEqual(emit_while_in_transaction, false)
    runInTransaction.mockRestore()
  })

  it('schedules the next round immediately when combat continues', async () => {
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
            cumulative_attacker_losses: [],
            cumulative_defender_losses: [],
          },
          round_summaries: [],
          started_at: 1_000,
          finished_at: null,
        })),
        update: battleUpdate,
      },
    } as unknown as Repository)

    const advanced_at = 5_000
    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at,
    })

    assert.equal(COMBAT_ROUND_INTERVAL_MS, 0)
    assert.strictEqual(applyBattleOutcomes.mock.calls.length, 0)
    assert.strictEqual(emit.mock.calls.length, 0)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls.length, 1)
    assert.deepStrictEqual(scheduleCombatRoundAdvance.mock.calls[0][0], {
      battle_id: 'battle-id',
      round: 2,
      execute_at: advanced_at + COMBAT_ROUND_INTERVAL_MS,
    })
  })

  function mockBattleWithState(state_json: Partial<BattleEntity['state_json']>) {
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
        attacker_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 50
          }
        ],
        defender_stacks: [
          {
            code: TroopCode.WAR_MACHINE,
            count: 50
          }
        ],
        attacker_origin: {
          x: 0,
          y: 0
        },
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [],
        ...state_json,
      },
      round_summaries: [],
      started_at: 1_000,
      finished_at: null,
    })
    // No technology repository: rounds must never read live technology levels.
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      battle: {
        getById: vi.fn().mockResolvedValue(battle),
        update: battleUpdate,
      },
    } as unknown as Repository)
    return battle
  }

  it('uses the modifiers snapshotted in state_json', async () => {
    const battle = mockBattleWithState({
      attacker_modifiers: {
        attack: 1.09,
        life: 1.06
      },
      defender_modifiers: {
        attack: 1,
        life: 1.03
      },
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000
    })

    const expected = CombatService.advanceRound({
      round: 1,
      attacker_stacks: battle.state_json.attacker_stacks,
      defender_stacks: battle.state_json.defender_stacks,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      attacker_modifiers: {
        attack: 1.09,
        life: 1.06
      },
      defender_modifiers: {
        attack: 1,
        life: 1.03
      },
    })
    const updated = battleUpdate.mock.calls[0][0]
    assert.deepStrictEqual(updated.round_summaries[0], expected.round_summary)
    assert.deepStrictEqual(updated.state_json.attacker_modifiers, {
      attack: 1.09,
      life: 1.06
    })
  })

  it('treats a missing snapshot as neutral modifiers', async () => {
    const battle = mockBattleWithState({})

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000
    })

    const expected = CombatService.advanceRound({
      round: 1,
      attacker_stacks: battle.state_json.attacker_stacks,
      defender_stacks: battle.state_json.defender_stacks,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      attacker_modifiers: {
        attack: 1,
        life: 1
      },
      defender_modifiers: {
        attack: 1,
        life: 1
      },
    })
    const updated = battleUpdate.mock.calls[0][0]
    assert.deepStrictEqual(updated.round_summaries[0], expected.round_summary)
  })
})
