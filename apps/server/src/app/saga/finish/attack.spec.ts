import assert from 'node:assert/strict'
import { beforeEach, describe, it, vi } from 'vitest'
import { Factory } from '#adapter/factory'
import { sagaFinishAttack } from '#app/saga/finish/attack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'

describe('sagaFinishAttack', () => {
  let scheduleCombatRoundAdvance: ReturnType<typeof vi.fn>
  let battleCreate: ReturnType<typeof vi.fn>

  let technology_levels: Record<string, Partial<Record<TechnologyCode, number>>>

  beforeEach(() => {
    technology_levels = {}
    scheduleCombatRoundAdvance = vi.fn().mockResolvedValue('job-id')
    battleCreate = vi.fn().mockResolvedValue('battle-id')

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleCombatRoundAdvance,
    } as unknown as JobQueue)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(MovementEntity.create({
          id: 'movement-id',
          player_id: 'attacker-id',
          action: MovementAction.ATTACK,
          origin: { x: 1, y: 1 },
          destination: { x: 2, y: 2 },
          combat_strategy: CombatStrategy.BALANCED,
        })),
      },
      player: {
        get: vi.fn().mockImplementation((id: string) => Promise.resolve({
          faction_code: id === 'attacker-id'
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        })),
      },
      cell: {
        getCell: vi.fn().mockResolvedValue({ id: 'dest-cell' }),
      },
      city: {
        searchByCell: vi.fn().mockResolvedValue(null),
      },
      outpost: {
        searchByCell: vi.fn().mockResolvedValue(null),
      },
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't1',
            player_id: 'attacker-id',
            cell_id: null,
            code: TroopCode.LEGIONNAIRE,
            count: 5,
            movement_id: 'movement-id',
          }),
        ]),
        listAllInCell: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't2',
            player_id: 'defender-id',
            cell_id: 'dest-cell',
            code: TroopCode.WAR_MACHINE,
            count: 3,
            movement_id: null,
          }),
        ]),
      },
      battle: {
        create: battleCreate,
      },
      technology: {
        list: vi.fn().mockImplementation(({
          player_id, codes
        }: { player_id: string; codes: TechnologyCode[] }) => Promise.resolve(codes
          .filter(code => technology_levels[player_id]?.[code] !== undefined)
          .map(code => TechnologyEntity.create({
            id: `${player_id}-${code}`,
            player_id,
            code,
            level: technology_levels[player_id][code] ?? 0,
          })))),
      },
    } as unknown as Repository)
  })

  it('creates battle and schedules round 1 without reports', async () => {
    await sagaFinishAttack({
      player_id: 'attacker-id',
      movement_id: 'movement-id',
      arrived_at: 1_000,
    })

    assert.strictEqual(battleCreate.mock.calls.length, 1)
    const battle = battleCreate.mock.calls[0][0]
    assert.strictEqual(battle.target_kind, BattleTargetKind.FIELD)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls.length, 1)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls[0][0].round, 1)
  })

  it('snapshots each side Arsenal modifiers into state_json', async () => {
    technology_levels = {
      'attacker-id': {
        [TechnologyCode.BALLISTIC_ALLOYS]: 3,
        [TechnologyCode.ORGANIC_PLATING]: 2,
      },
      'defender-id': { [TechnologyCode.ORGANIC_PLATING]: 1 },
    }

    await sagaFinishAttack({
      player_id: 'attacker-id',
      movement_id: 'movement-id',
      arrived_at: 1_000,
    })

    const battle = battleCreate.mock.calls[0][0]
    assert.ok(Math.abs(battle.state_json.attacker_modifiers.attack - 1.09) < 1e-9)
    assert.ok(Math.abs(battle.state_json.attacker_modifiers.life - 1.06) < 1e-9)
    assert.deepStrictEqual(battle.state_json.defender_modifiers.attack, 1)
    assert.ok(Math.abs(battle.state_json.defender_modifiers.life - 1.03) < 1e-9)
  })
})
