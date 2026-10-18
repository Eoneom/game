import assert from 'node:assert/strict'
import { beforeEach, describe, it, vi } from 'vitest'
import { Factory } from '#adapter/factory'
import { createBattleReports } from '#app/command/communication/report/create-battle'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { FactionCode } from '#core/faction/constant/code'
import { Repository } from '#app/port/repository/generic'

describe('createBattleReports', () => {
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
      report: {
        createBattleReports: createBattleReportsRepo,
      },
    } as unknown as Repository)
  })

  it('persists battle reports for attacker and defender', async () => {
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker-id',
      defender_player_id: 'defender-id',
      cell_id: 'cell-id',
      target_kind: BattleTargetKind.FIELD,
      target_id: null,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.DEFENSIVE,
      current_round: 2,
      status: 'finished',
      winner: BattleWinner.ATTACKER,
      state_json: {
        attacker_stacks: [{ code: 'legionnaire', count: 2 }],
        defender_stacks: [],
        attacker_origin: { x: 1, y: 1 },
        round_summaries: [{ round: 1, attacker_attack_pool: 1, defender_attack_pool: 1, attacker_life_pool: 1, defender_life_pool: 1, attacker_losses: [], defender_losses: [] }],
        cumulative_attacker_losses: [],
        cumulative_defender_losses: [{ code: 'war_machine', count: 3 }],
      },
      started_at: 1_000,
      finished_at: 2_000,
    })

    const movement = MovementEntity.create({
      id: 'movement-id',
      player_id: 'attacker-id',
      action: MovementAction.ATTACK,
      origin: { x: 1, y: 1 },
      destination: { x: 2, y: 2 },
      combat_strategy: CombatStrategy.BALANCED,
    })

    await createBattleReports({
      battle,
      movement,
      outcome: {
        occupied: true,
        destroyed_temp_outpost: false,
        loot_applied: false,
        attacker_retreated: false,
      },
      loot: { plastic: 0, mushroom: 0, plasma: 0 },
      finished_at: 2_000,
    })

    assert.strictEqual(createBattleReportsRepo.mock.calls.length, 1)
  })
})
