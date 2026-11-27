import assert from 'node:assert/strict'
import {
  beforeEach, describe, it, vi 
} from 'vitest'
import { Factory } from '#adapter/factory'
import { createBattleReports } from '#app/command/communication/report/create-battle'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopCode } from '#core/troop/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { Repository } from '#app/port/repository/generic'

describe('createBattleReports city defenses (slice 029)', () => {
  let createBattleReportsRepo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createBattleReportsRepo = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockImplementation((player_id: string) => Promise.resolve({
          id: player_id,
          faction_code: player_id === 'attacker-id'
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        })),
      },
      report: { createBattleReports: createBattleReportsRepo },
    } as unknown as Repository)
  })

  it('keeps defense lines (with kind), plasma spent and shield reduction in the metadata only', async () => {
    const round_summary = {
      round: 1,
      attacker_attack_pool: 700,
      defender_attack_pool: 160,
      attacker_life_pool: 150,
      defender_life_pool: 750,
      attacker_losses: [],
      defender_losses: [
        {
          kind: 'defense' as const,
          code: DefenseCode.RAMPART,
          count: 2 
        } 
      ],
      defender_plasma_spent: 10,
      shield_reduction: 0.3,
    }
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker-id',
      defender_player_id: 'defender-id',
      cell_id: 'cell-id',
      target_kind: BattleTargetKind.CITY,
      target_id: 'city-id',
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 1,
      status: 'finished',
      winner: BattleWinner.DEFENDER,
      state_json: {
        attacker_stacks: [],
        defender_stacks: [],
        attacker_origin: {
          x: 1,
          y: 1 
        },
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 1 
          },
          {
            kind: 'defense',
            code: DefenseCode.RAMPART,
            count: 2 
          },
        ],
      },
      round_summaries: [ round_summary ],
      started_at: 1_000,
      finished_at: 2_000,
    })

    await createBattleReports({
      battle,
      movement: MovementEntity.create({
        id: 'movement-id',
        player_id: 'attacker-id',
        action: MovementAction.ATTACK,
        origin: {
          x: 1,
          y: 1 
        },
        destination: {
          x: 2,
          y: 2 
        },
        combat_strategy: CombatStrategy.SIEGE_ASSAULT,
      }),
      outcome: {
        occupied: false,
        destroyed_temp_outpost: false,
        loot_applied: false,
        attacker_retreated: true,
      },
      loot: {
        plastic: 0,
        mushroom: 0,
        plasma: 0 
      },
      finished_at: 2_000,
    })

    const call = createBattleReportsRepo.mock.calls[0][0]
    assert.deepEqual(call.defender_report.troops, [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 1 
      } 
    ])
    for (const metadata of [
      call.defender_metadata,
      call.attacker_metadata 
    ]) {
      assert.deepEqual(metadata.casualties_defender, [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1 
        },
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 2 
        },
      ])
      assert.equal(metadata.round_summaries[0].defender_plasma_spent, 10)
      assert.equal(metadata.round_summaries[0].shield_reduction, 0.3)
    }
  })
})
