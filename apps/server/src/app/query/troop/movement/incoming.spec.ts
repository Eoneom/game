import assert from 'assert'
import { TroopMovementIncomingQuery } from '#app/query/troop/movement/incoming'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { FactionCode } from '#core/faction/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { MovementEntity } from '#core/troop/movement/entity'

describe('TroopMovementIncomingQuery', () => {
  const player_id = 'defender-id'
  const attacker_id = 'attacker-id'
  let detection_level: number
  let movements: MovementEntity[]
  let pending: Record<string, number | null>
  let listIncomingAttacks: ReturnType<typeof vi.fn>

  const attackMovement = (movement_id: string) => MovementEntity.create({
    id: movement_id,
    player_id: attacker_id,
    action: MovementAction.ATTACK,
    origin: {
      x: 9,
      y: 9 
    },
    destination: {
      x: 2,
      y: 3 
    },
    combat_strategy: CombatStrategy.SIEGE_ASSAULT,
  })

  beforeEach(() => {
    detection_level = 1
    movements = [ attackMovement('attack-1') ]
    pending = { 'attack-1': 50_000 }
    listIncomingAttacks = vi.fn().mockImplementation(async () => movements)

    vi.spyOn(AppService, 'getTechnologyLevels').mockImplementation(async ({ codes }) => Object.fromEntries(codes.map(code => [
      code,
      code === TechnologyCode.DETECTION ? detection_level : 0 
    ])) as never)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopMovementFinish: vi.fn().mockImplementation(async ({ movement_id }: { movement_id: string }) => {
        const execute_at = pending[movement_id]
        return execute_at ? {
          movement_id,
          execute_at 
        } : null
      }),
    } as unknown as JobQueue)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: { listIncomingAttacks },
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't1',
            player_id: attacker_id,
            cell_id: null,
            code: TroopCode.PENITENT_HORDE,
            count: 21,
            movement_id: 'attack-1' 
          }),
          TroopEntity.create({
            id: 't2',
            player_id: attacker_id,
            cell_id: null,
            code: TroopCode.CINDER_TITAN,
            count: 2,
            movement_id: 'attack-1' 
          }),
        ]),
      },
      player: {
        get: vi.fn().mockResolvedValue({
          id: attacker_id,
          name: 'Raider',
          faction_code: FactionCode.THE_ASH_LITURGY 
        }) 
      },
      cell: { getCell: vi.fn().mockResolvedValue({ id: 'cell-id' }) },
      city: {
        searchByCell: vi.fn().mockResolvedValue(CityEntity.create({
          id: 'city-id',
          name: 'Capitale',
          player_id,
          cell_id: 'cell-id',
          default_combat_strategy: null,
        })),
      },
      outpost: { searchByCell: vi.fn().mockResolvedValue(null) },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const run = () => new TroopMovementIncomingQuery().run({ player_id })

  it('returns nothing at detection 0 without looking up movements', async () => {
    detection_level = 0

    const { movements: result } = await run()

    assert.deepStrictEqual(result, [])
    assert.strictEqual(listIncomingAttacks.mock.calls.length, 0)
  })

  it('shows the target and arrival time but hides the attacker at level 1', async () => {
    const { movements: result } = await run()

    assert.deepStrictEqual(result, [
      {
        id: 'attack-1',
        target: {
          kind: BattleTargetKind.CITY,
          id: 'city-id',
          name: 'Capitale',
          coordinates: {
            x: 2,
            y: 3 
          },
        },
        arrive_at: 50_000,
      },
    ])
    expect(listIncomingAttacks).toHaveBeenCalledWith({ player_id })
  })

  it('rounds the army size at level 3', async () => {
    detection_level = 3

    const [ view ] = (await run()).movements

    assert.deepStrictEqual(view.attacker, {
      name: 'Raider',
      faction_code: FactionCode.THE_ASH_LITURGY 
    })
    assert.strictEqual(view.unit_count, 20)
    assert.strictEqual(view.troops, undefined)
  })

  it('shows the composition at level 4 and never the strategy', async () => {
    detection_level = 4

    const [ view ] = (await run()).movements

    assert.deepStrictEqual(view.troops, [
      {
        code: TroopCode.PENITENT_HORDE,
        count: 21 
      },
      {
        code: TroopCode.CINDER_TITAN,
        count: 2 
      },
    ])
    assert.ok(!JSON.stringify(view).includes(CombatStrategy.SIEGE_ASSAULT))
    assert.ok(!('combat_strategy' in view))
  })

  it('reads the detection level live on each query', async () => {
    const before = (await run()).movements[0]
    detection_level = 2
    const after = (await run()).movements[0]

    assert.strictEqual(before.attacker, undefined)
    assert.deepStrictEqual(after.attacker, {
      name: 'Raider',
      faction_code: FactionCode.THE_ASH_LITURGY 
    })
  })

  it('drops attacks that already arrived and sorts by arrival', async () => {
    movements = [
      attackMovement('attack-1'),
      attackMovement('attack-2'),
      attackMovement('arrived') 
    ]
    pending = {
      'attack-1': 50_000,
      'attack-2': 20_000,
      arrived: null 
    }

    const result = (await run()).movements

    assert.deepStrictEqual(result.map(view => view.id), [
      'attack-2',
      'attack-1' 
    ])
  })
})
