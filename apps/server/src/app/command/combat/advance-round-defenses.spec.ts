import assert from 'node:assert/strict'
import {
  beforeEach, describe, it, vi, type MockInstance
} from 'vitest'
import { Factory } from '#adapter/factory'
import { advanceCombatRound } from '#app/command/combat/advance-round'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleStack } from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { AppEventBus } from '#app/event-bus'
import { testResourceStock } from '#app/test-support/resource-stock'

vi.mock('#app/command/combat/apply-battle-outcomes', () => ({
  applyBattleOutcomes: vi.fn().mockResolvedValue({
    attacker_player_id: 'attacker-id',
    defender_player_id: 'defender-id',
    attacker_report_id: 'attacker-report-id',
    defender_report_id: 'defender-report-id',
  }),
}))

describe('advanceCombatRound city defenses (slice 029)', () => {
  let battleUpdate: MockInstance
  let stockGet: MockInstance
  let stockUpdateOne: MockInstance

  function setup({
    defender_stacks,
    target_kind = BattleTargetKind.CITY,
    plasma,
  }: {
    defender_stacks: BattleStack[]
    target_kind?: BattleTargetKind
    plasma: number
  }): void {
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: vi.fn() } as unknown as AppEventBus)
    battleUpdate = vi.fn().mockResolvedValue(undefined)
    stockGet = vi.fn().mockResolvedValue(testResourceStock({
      cell_id: 'cell-id',
      plastic: 100,
      mushroom: 100,
      plasma,
    }))
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker-id',
      defender_player_id: 'defender-id',
      cell_id: 'cell-id',
      target_kind,
      target_id: target_kind === BattleTargetKind.FIELD ? null : 'city-id',
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 0,
      status: 'in_progress',
      winner: null,
      state_json: {
        attacker_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 10 
          } 
        ],
        defender_stacks,
        attacker_origin: {
          x: 0,
          y: 0 
        },
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
      resource_stock: {
        getByCellId: stockGet,
        updateOne: stockUpdateOne,
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleCombatRoundAdvance: vi.fn().mockResolvedValue('job-id') } as unknown as JobQueue)
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fires batteries from the city stock and debits the plasma spent during the round', async () => {
    setup({
      defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.PLASMA_BATTERY,
          count: 5 
        },
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 20 
        },
      ],
      plasma: 17,
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    const summary = battleUpdate.mock.calls[0][0].round_summaries[0]
    assert.equal(summary.defender_plasma_spent, 15)
    assert.equal(summary.defender_attack_pool, 3 * 80)
    assert.equal(stockUpdateOne.mock.calls[0][0].plasma, 2)
  })

  it('does not read the stock when the defender has no battery', async () => {
    setup({
      defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.TURRET,
          count: 5 
        } 
      ],
      plasma: 100,
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    assert.equal(stockGet.mock.calls.length, 0)
    assert.equal(stockUpdateOne.mock.calls.length, 0)
    assert.equal(battleUpdate.mock.calls[0][0].round_summaries[0].defender_plasma_spent, 0)
  })

  it('records defense loss lines with their kind in the cumulative losses', async () => {
    setup({
      defender_stacks: [
        {
          code: TroopCode.WAR_MACHINE,
          count: 1 
        },
        {
          kind: 'defense',
          code: DefenseCode.MINEFIELD,
          count: 3 
        },
      ],
      plasma: 0,
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 1,
      advanced_at: 5_000,
    })

    const losses = battleUpdate.mock.calls[0][0].state_json.cumulative_defender_losses
    assert.deepEqual(
      losses.find((line: { code: string }) => line.code === DefenseCode.MINEFIELD),
      {
        kind: 'defense',
        code: DefenseCode.MINEFIELD,
        count: 3 
      }
    )
  })
})
