import assert from 'node:assert/strict'
import {
  beforeEach, describe, it, vi 
} from 'vitest'
import { Factory } from '#adapter/factory'
import { sagaFinishAttack } from '#app/saga/finish/attack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CityEntity } from '#core/city/entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'

describe('sagaFinishAttack city defenses (slice 029)', () => {
  let battleCreate: ReturnType<typeof vi.fn>
  let technology_levels: Record<string, Partial<Record<TechnologyCode, number>>>
  const city = CityEntity.create({
    id: 'city-id',
    name: 'Bastion',
    player_id: 'defender-id',
    cell_id: 'dest-cell',
    default_combat_strategy: CombatStrategy.HOLD_THE_LINE,
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    technology_levels = {}
    battleCreate = vi.fn().mockResolvedValue('battle-id')

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleCombatRoundAdvance: vi.fn().mockResolvedValue('job-id') } as unknown as JobQueue)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(MovementEntity.create({
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
        })),
      },
      player: {
        get: vi.fn().mockImplementation((id: string) => Promise.resolve({
          faction_code: id === 'attacker-id'
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        })),
      },
      cell: { getCell: vi.fn().mockResolvedValue({ id: 'dest-cell' }) },
      city: {
        searchByCell: vi.fn().mockResolvedValue(city),
        get: vi.fn().mockResolvedValue(city),
      },
      outpost: { searchByCell: vi.fn().mockResolvedValue(null) },
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't1',
            player_id: 'attacker-id',
            cell_id: null,
            code: TroopCode.WAR_MACHINE,
            count: 5,
            movement_id: 'movement-id',
          }),
        ]),
        listAllInCell: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't2',
            player_id: 'defender-id',
            cell_id: 'dest-cell',
            code: TroopCode.LEGIONNAIRE,
            count: 3,
            movement_id: null,
          }),
        ]),
      },
      defense: {
        listByCity: vi.fn().mockResolvedValue([
          DefenseEntity.create({
            id: 'd1',
            player_id: 'defender-id',
            city_id: 'city-id',
            code: DefenseCode.RAMPART,
            count: 4 
          }),
          DefenseEntity.create({
            id: 'd2',
            player_id: 'defender-id',
            city_id: 'city-id',
            code: DefenseCode.TURRET,
            count: 0 
          }),
        ]),
      },
      battle: { create: battleCreate },
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

  it('adds the city defense stacks to the defender snapshot', async () => {
    await sagaFinishAttack({
      player_id: 'attacker-id',
      movement_id: 'movement-id',
      arrived_at: 1_000,
    })

    const battle = battleCreate.mock.calls[0][0]
    assert.equal(battle.target_kind, BattleTargetKind.CITY)
    assert.equal(battle.attacker_strategy, CombatStrategy.SIEGE_ASSAULT)
    assert.equal(battle.defender_strategy, CombatStrategy.HOLD_THE_LINE)
    assert.deepEqual(battle.state_json.defender_stacks, [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 3 
      },
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 4 
      },
    ])
  })

  it('snapshots the defender Fortification multiplier', async () => {
    technology_levels = { 'defender-id': { [TechnologyCode.FORTIFICATION]: 2 } }

    await sagaFinishAttack({
      player_id: 'attacker-id',
      movement_id: 'movement-id',
      arrived_at: 1_000,
    })

    const battle = battleCreate.mock.calls[0][0]
    assert.ok(Math.abs(battle.state_json.defender_modifiers.fortification - 1.06) < 1e-9)
  })
})
