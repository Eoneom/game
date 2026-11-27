import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { sagaFinishAttack } from '#app/saga/finish/attack'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
import { AllianceRole } from '#core/alliance/constant/role'
import { CityEntity } from '#core/city/entity'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'

describe('sagaFinishAttack garrison snapshot (slice 037)', () => {
  const stationed = (id: string, player_id: string, code: TroopCode, count: number) => TroopEntity.create({
    id,
    player_id,
    cell_id: 'target-cell',
    code,
    count,
    movement_id: null,
  })
  const city = CityEntity.create({
    id: 'city-id',
    player_id: 'host',
    name: 'Fort',
    cell_id: 'target-cell',
  })
  const outpost = OutpostEntity.create({
    id: 'outpost-id',
    player_id: 'host',
    cell_id: 'target-cell',
    type: OutpostType.PERMANENT,
  })

  let battleCreate: ReturnType<typeof vi.fn>
  let host_faction: FactionCode
  let target: 'city' | 'outpost'

  const run = async (): Promise<BattleEntity> => {
    await sagaFinishAttack({
      player_id: 'attacker',
      movement_id: 'movement-id',
      arrived_at: 1000,
    })
    return battleCreate.mock.calls[0][0] as BattleEntity
  }

  beforeEach(() => {
    host_faction = FactionCode.THE_BASTION_ORDER
    target = 'city'
    battleCreate = vi.fn().mockResolvedValue('battle-id')
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleCombatRoundAdvance: vi.fn().mockResolvedValue('job') } as unknown as JobQueue)
    vi.spyOn(AppService, 'getCombatModifiers').mockImplementation(async ({ player_id }) => player_id === 'ally'
      ? {
        attack: 1.3,
        life: 1.2
      }
      : {
        attack: 1,
        life: 1.03
      })
    vi.spyOn(AppService, 'getFortificationMultiplier').mockResolvedValue(1)

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
          combat_strategy: CombatStrategy.BALANCED,
        })),
      },
      player: {
        get: vi.fn(async (id: string) => ({
          id,
          faction_code: id === 'attacker' ? FactionCode.THE_CONFEDERATION : host_faction,
        })),
      },
      cell: { getCell: vi.fn().mockResolvedValue({ id: 'target-cell' }) },
      city: {
        searchByCell: vi.fn(async () => target === 'city' ? city : null),
        get: vi.fn().mockResolvedValue(city),
      },
      outpost: {
        searchByCell: vi.fn(async () => target === 'outpost' ? outpost : null),
        getById: vi.fn().mockResolvedValue(outpost),
      },
      defense: { listByCity: vi.fn().mockResolvedValue([]) },
      alliance: {
        findMembership: vi.fn(async (player_id: string) => ({
          alliance_id: 'a1',
          player_id,
          role: AllianceRole.CHEF,
          joined_at: 0
        })),
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
            code: TroopCode.LEGIONNAIRE,
            count: 50,
            movement_id: 'movement-id',
          }),
        ]),
        listAllInCell: vi.fn().mockResolvedValue([
          stationed('host-grenadier', 'host', TroopCode.GRENADIER, 10),
          stationed('ally-grenadier', 'ally', TroopCode.GRENADIER, 4),
        ]),
      },
      battle: { create: battleCreate },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('snapshots garrison 1.15 in the host modifiers when a Bastion city is attacked, never for reinforcements', async () => {
    const battle = await run()

    expect(battle.target_kind).toBe(BattleTargetKind.CITY)
    expect(battle.state_json.defender_modifiers).toEqual({
      attack: 1,
      life: 1.03,
      fortification: 1,
      garrison: 1.15,
    })
    expect(battle.state_json.defender_owner_modifiers).toEqual({
      ally: {
        attack: 1.3,
        life: 1.2
      }
    })
    expect(battle.state_json.defender_stacks).toEqual([
      {
        code: TroopCode.GRENADIER,
        count: 10
      },
      {
        code: TroopCode.GRENADIER,
        count: 4,
        player_id: 'ally'
      },
    ])
    expect(battle.state_json.attacker_modifiers?.garrison).toBeUndefined()
  })

  it('does not snapshot a garrison for a Bastion outpost', async () => {
    target = 'outpost'
    const battle = await run()

    expect(battle.target_kind).toBe(BattleTargetKind.OUTPOST)
    expect(battle.state_json.defender_modifiers?.garrison).toBeUndefined()
  })

  it('does not snapshot a garrison for a city of another faction', async () => {
    host_faction = FactionCode.THE_SYMBIOSIS
    const battle = await run()

    expect(battle.target_kind).toBe(BattleTargetKind.CITY)
    expect(battle.state_json.defender_modifiers?.garrison).toBeUndefined()
  })
})
