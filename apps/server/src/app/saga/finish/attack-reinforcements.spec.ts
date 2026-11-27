import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { sagaFinishAttack } from '#app/saga/finish/attack'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { AllianceRole } from '#core/alliance/constant/role'
import { CityEntity } from '#core/city/entity'
import { BattleEntity } from '#core/combat/entity/battle'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'

describe('sagaFinishAttack against a reinforced city (slice 033)', () => {
  const stationed = (id: string, player_id: string, code: TroopCode, count: number) => TroopEntity.create({
    id,
    player_id,
    cell_id: 'city-cell',
    code,
    count,
    movement_id: null,
  })

  let battleCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    battleCreate = vi.fn().mockResolvedValue('battle-id')
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleCombatRoundAdvance: vi.fn().mockResolvedValue('job') } as unknown as JobQueue)
    vi.spyOn(AppService, 'getCombatModifiers').mockImplementation(async ({ player_id }) => ({
      attacker: {
        attack: 1.1,
        life: 1 
      },
      host: {
        attack: 1.02,
        life: 1.02 
      },
      ally: {
        attack: 1.3,
        life: 1.2 
      },
    }[player_id] ?? {
      attack: 1,
      life: 1 
    }))
    vi.spyOn(AppService, 'getFortificationMultiplier').mockImplementation(async ({ player_id }) => player_id === 'host' ? 1.25 : 9)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(MovementEntity.create({
          id: 'movement-id',
          player_id: 'attacker',
          action: MovementAction.ATTACK,
          origin: {
            x: 1,
            y: 1 
          },
          destination: {
            x: 2,
            y: 2 
          },
          combat_strategy: CombatStrategy.OPENING_STRIKE,
        })),
      },
      player: {
        get: vi.fn(async (id: string) => ({
          id,
          faction_code: id === 'attacker' ? FactionCode.THE_ASH_LITURGY : FactionCode.THE_CONFEDERATION
        })),
      },
      cell: { getCell: vi.fn().mockResolvedValue({ id: 'city-cell' }) },
      city: {
        searchByCell: vi.fn().mockResolvedValue(CityEntity.create({
          id: 'city-id',
          player_id: 'host',
          name: 'Bastion',
          cell_id: 'city-cell',
          default_combat_strategy: CombatStrategy.HOLD_THE_LINE,
        })),
        get: vi.fn().mockResolvedValue(CityEntity.create({
          id: 'city-id',
          player_id: 'host',
          name: 'Bastion',
          cell_id: 'city-cell',
          default_combat_strategy: CombatStrategy.HOLD_THE_LINE,
        })),
      },
      outpost: { searchByCell: vi.fn().mockResolvedValue(null) },
      defense: {
        listByCity: vi.fn().mockResolvedValue([
          {
            code: DefenseCode.TURRET,
            count: 2 
          } 
        ]) 
      },
      alliance: {
        findMembership: vi.fn(async (player_id: string) => player_id === 'host'
          ? {
            alliance_id: 'a1',
            player_id,
            role: AllianceRole.CHEF,
            joined_at: 0 
          }
          : null),
        listMembers: vi.fn().mockResolvedValue([
          {
            alliance_id: 'a1',
            player_id: 'host',
            role: AllianceRole.CHEF,
            joined_at: 0 
          },
          {
            alliance_id: 'a1',
            player_id: 'ally',
            role: AllianceRole.MEMBRE,
            joined_at: 0 
          },
        ]),
      },
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 'attackers',
            player_id: 'attacker',
            cell_id: null,
            code: TroopCode.PENITENT_HORDE,
            count: 50,
            movement_id: 'movement-id',
          }),
        ]),
        listAllInCell: vi.fn().mockResolvedValue([
          stationed('host-legion', 'host', TroopCode.LEGIONNAIRE, 10),
          stationed('ally-legion', 'ally', TroopCode.LEGIONNAIRE, 6),
          stationed('ally-interceptor', 'ally', TroopCode.INTERCEPTOR, 2),
          // Troops of a non-member on the cell are not reinforcements.
          stationed('outsider-legion', 'outsider', TroopCode.LEGIONNAIRE, 99),
        ]),
      },
      battle: { create: battleCreate },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds every allied reinforcement stack with its owner, per-owner modifiers, host strategy and fortification', async () => {
    await sagaFinishAttack({
      player_id: 'attacker',
      movement_id: 'movement-id',
      arrived_at: 1000,
    })

    const battle = battleCreate.mock.calls[0][0] as BattleEntity
    expect(battle.defender_player_id).toBe('host')
    expect(battle.defender_strategy).toBe(CombatStrategy.HOLD_THE_LINE)
    expect(battle.state_json.defender_stacks).toEqual([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10 
      },
      {
        code: TroopCode.LEGIONNAIRE,
        count: 6,
        player_id: 'ally' 
      },
      {
        code: TroopCode.INTERCEPTOR,
        count: 2,
        player_id: 'ally' 
      },
      {
        kind: 'defense',
        code: DefenseCode.TURRET,
        count: 2 
      },
    ])
    expect(battle.state_json.defender_modifiers).toEqual({
      attack: 1.02,
      life: 1.02,
      fortification: 1.25 
    })
    expect(battle.state_json.defender_owner_modifiers).toEqual({
      ally: {
        attack: 1.3,
        life: 1.2 
      } 
    })
  })
})
