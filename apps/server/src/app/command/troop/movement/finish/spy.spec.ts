import assert from 'assert'
import type { MockInstance } from 'vitest'
import { finishTroopSpyMovement } from '#app/command/troop/movement/finish/spy'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { SpyReportEntry } from '#app/port/repository/report'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { CityEntity } from '#core/city/entity'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { ReportType } from '#core/communication/value/report-type'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { FactionCode } from '#core/faction/constant/code'
import {
  ReportSpyDetectedMetadata,
  ReportSpyMetadata,
} from '#core/intel/type'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { ExplorationEntity } from '#core/world/exploration/entity'
import { now } from '#shared/time'

describe('finishTroopSpyMovement', () => {
  const spy_id = 'spy-id'
  const target_owner_id = 'target-owner-id'
  const movement_id = 'movement-id'
  const destination_cell_id = 'dest-cell'
  const arrived_at = now() - 5_000

  let levels: Record<string, Partial<Record<TechnologyCode, number>>>
  let city: CityEntity | null
  let outpost: OutpostEntity | null
  let cell_troops: TroopEntity[]
  let target_faction: FactionCode
  let createSpyReports: MockInstance
  let troopDelete: MockInstance
  let troopUpdateOne: MockInstance
  let movementDelete: MockInstance
  let movementCreate: MockInstance
  let explorationUpdateOne: MockInstance
  let scheduleTroopMovementFinish: MockInstance

  const scouts = (count: number) => [
    TroopEntity.create({
      id: 'scout-troop',
      player_id: spy_id,
      cell_id: null,
      code: TroopCode.EXPLORER,
      count,
      movement_id,
    }),
  ]
  let movement_troops: TroopEntity[]

  const enemyStack = (code: TroopCode, count: number) => TroopEntity.create({
    id: `troop-${code}`,
    player_id: target_owner_id,
    cell_id: destination_cell_id,
    code,
    count,
    movement_id: null,
  })

  const reports = (): SpyReportEntry[] => createSpyReports.mock.calls.flatMap(([ entries ]) => entries)
  const spyReport = () => {
    const entry = reports().find(({ report }) => report.type === ReportType.SPY)
    assert.ok(entry)
    return {
      ...entry,
      metadata: entry.metadata as ReportSpyMetadata,
    }
  }

  beforeEach(() => {
    levels = {
      [spy_id]: { [TechnologyCode.ESPIONAGE]: 3 },
      [target_owner_id]: { [TechnologyCode.DETECTION]: 1 },
    }
    city = CityEntity.create({
      id: 'city-id',
      name: 'Bastion',
      player_id: target_owner_id,
      cell_id: destination_cell_id,
      default_combat_strategy: CombatStrategy.HOLD_THE_LINE,
    })
    outpost = null
    target_faction = FactionCode.THE_ASH_LITURGY
    movement_troops = scouts(1)
    cell_troops = [
      enemyStack(TroopCode.PENITENT_HORDE, 12),
      enemyStack(TroopCode.CINDER_TITAN, 2),
    ]

    createSpyReports = vi.fn().mockResolvedValue(undefined)
    troopDelete = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    movementDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    explorationUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job-id')

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    vi.spyOn(AppService, 'getTechnologyLevels').mockImplementation(async ({
      player_id, codes 
    }) => Object.fromEntries(codes.map(code => [
      code,
      levels[player_id]?.[code] ?? 0 
    ])) as never)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(MovementEntity.create({
          id: movement_id,
          player_id: spy_id,
          action: MovementAction.SPY,
          origin: {
            x: 1,
            y: 1 
          },
          destination: {
            x: 4,
            y: 4 
          },
        })),
        delete: movementDelete,
        create: movementCreate,
      },
      player: {
        get: vi.fn().mockImplementation(async (requested: string) => ({
          id: requested,
          name: requested === spy_id ? 'Espion' : 'Cible',
          faction_code: requested === spy_id ? FactionCode.THE_CONFEDERATION : target_faction,
        })),
      },
      cell: { getCell: vi.fn().mockResolvedValue({ id: destination_cell_id }) },
      city: {
        searchByCell: vi.fn().mockImplementation(async () => city),
        get: vi.fn().mockImplementation(async () => city),
      },
      outpost: {
        searchByCell: vi.fn().mockImplementation(async () => outpost),
        getById: vi.fn().mockImplementation(async () => outpost),
      },
      troop: {
        listByMovement: vi.fn().mockImplementation(async () => movement_troops),
        listAllInCell: vi.fn().mockImplementation(async () => cell_troops),
        delete: troopDelete,
        updateOne: troopUpdateOne,
      },
      defense: {
        listByCity: vi.fn().mockResolvedValue([
          DefenseEntity.create({
            id: 'd1',
            player_id: target_owner_id,
            city_id: 'city-id',
            code: DefenseCode.TURRET,
            count: 4 
          }),
          DefenseEntity.create({
            id: 'd2',
            player_id: target_owner_id,
            city_id: 'city-id',
            code: DefenseCode.RAMPART,
            count: 0 
          }),
        ]),
      },
      building: {
        list: vi.fn().mockResolvedValue([
          BuildingEntity.create({
            id: 'b1',
            city_id: 'city-id',
            code: BuildingCode.RESEARCH_LAB,
            level: 3 
          }),
          BuildingEntity.create({
            id: 'b2',
            city_id: 'city-id',
            code: BuildingCode.CITY_WALL,
            level: 0 
          }),
        ]),
      },
      technology: {
        list: vi.fn().mockResolvedValue([
          TechnologyEntity.create({
            id: 't1',
            player_id: target_owner_id,
            code: TechnologyCode.DETECTION,
            level: 1 
          }),
          TechnologyEntity.create({
            id: 't2',
            player_id: target_owner_id,
            code: TechnologyCode.ARCHITECTURE,
            level: 0 
          }),
        ]),
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue({
          plastic: 1200.7,
          mushroom: 800.2,
          plasma: 15.9 
        }) 
      },
      exploration: {
        get: vi.fn().mockResolvedValue(ExplorationEntity.create({
          id: 'exploration-id',
          player_id: spy_id,
          cell_ids: [ 'known-cell' ] 
        })),
        updateOne: explorationUpdateOne,
      },
      report: { createSpyReports },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const run = (roll: number) => finishTroopSpyMovement({
    player_id: spy_id,
    movement_id,
    arrived_at,
    random: () => roll,
  })

  it('rejects a movement owned by another player', async () => {
    await assert.rejects(
      () => finishTroopSpyMovement({
        player_id: 'someone-else',
        movement_id,
        arrived_at,
        random: () => 0 
      }),
      new RegExp(TroopError.MOVEMENT_NOT_OWNER)
    )
  })

  describe('success', () => {
    it('stores the roll and probability, gives tier max(1, gap) and sends the scouts home', async () => {
      const result = await run(0.7)

      assert.strictEqual(result.outcome, 'success')
      const {
        report, metadata, target_player_id 
      } = spyReport()
      assert.strictEqual(report.player_id, spy_id)
      assert.deepStrictEqual(report.troops, [
        {
          code: TroopCode.EXPLORER,
          count: 1 
        } 
      ])
      assert.strictEqual(target_player_id, target_owner_id)
      assert.strictEqual(metadata.success, true)
      assert.strictEqual(metadata.aborted, false)
      assert.strictEqual(metadata.roll, 0.7)
      // gap = 3 − 1 = 2 → 0.50 + 0.30
      assert.strictEqual(metadata.p_success, 0.8)
      assert.strictEqual(metadata.tier, 2)
      assert.strictEqual(metadata.scouts_lost, 0)
      assert.deepStrictEqual(metadata.target, {
        kind: BattleTargetKind.CITY,
        id: 'city-id',
        name: 'Bastion',
        owner_name: 'Cible',
        faction_code: FactionCode.THE_ASH_LITURGY,
        coordinates: {
          x: 4,
          y: 4 
        },
      })
      assert.strictEqual(reports().length, 1, 'the target is not notified')

      const base_movement = movementCreate.mock.calls[0][0] as MovementEntity
      assert.strictEqual(base_movement.action, MovementAction.BASE)
      assert.deepStrictEqual(base_movement.destination, {
        x: 1,
        y: 1 
      })
      assert.strictEqual(movementDelete.mock.calls[0][0], movement_id)
      assert.strictEqual(troopUpdateOne.mock.calls[0][0].movement_id, base_movement.id)
      assert.strictEqual(troopDelete.mock.calls.length, 0)
    })

    it('marks the target cell explored for the spy owner', async () => {
      await run(0)

      const exploration = explorationUpdateOne.mock.calls[0][0] as ExplorationEntity
      assert.deepStrictEqual([ ...exploration.cell_ids ].sort(), [
        destination_cell_id,
        'known-cell' 
      ].sort())
    })

    it('gives tier 1 on a lucky success with gap ≤ 0', async () => {
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 1 }
      levels[target_owner_id] = { [TechnologyCode.DETECTION]: 3 }

      await run(0.01)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.success, true)
      assert.strictEqual(metadata.p_success, 0.2)
      assert.strictEqual(metadata.tier, 1)
    })

    it('adds 0.02 per extra scout', async () => {
      movement_troops = scouts(4)

      await run(0.85)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.p_success, 0.86)
      assert.strictEqual(metadata.success, true)
    })
  })

  describe('tiers', () => {
    const intelKeys = (metadata: ReportSpyMetadata) => [
      'troops',
      'defenses',
      'default_strategy',
      'resources',
      'buildings',
      'technologies',
      'outpost_type',
    ].filter(key => key in metadata).sort()

    it('city tier 1 shows the owner stationary troops only', async () => {
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 1 }

      await run(0)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.tier, 1)
      assert.deepStrictEqual(intelKeys(metadata), [ 'troops' ])
      assert.deepStrictEqual(metadata.troops, [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 12 
        },
        {
          code: TroopCode.CINDER_TITAN,
          count: 2 
        },
      ])
    })

    it('city tier 4 adds defenses, strategy, resources, buildings and technologies', async () => {
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 5 }

      await run(0)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.tier, 4)
      assert.deepStrictEqual(intelKeys(metadata), [
        'buildings',
        'default_strategy',
        'defenses',
        'resources',
        'technologies',
        'troops' 
      ])
      assert.deepStrictEqual(metadata.defenses, [
        {
          code: DefenseCode.TURRET,
          count: 4 
        } 
      ])
      assert.strictEqual(metadata.default_strategy, CombatStrategy.HOLD_THE_LINE)
      assert.deepStrictEqual(metadata.resources, {
        plastic: 1200,
        mushroom: 800,
        plasma: 15 
      })
      assert.deepStrictEqual(metadata.buildings, [
        {
          code: BuildingCode.RESEARCH_LAB,
          level: 3 
        } 
      ])
      assert.deepStrictEqual(metadata.technologies, [
        {
          code: TechnologyCode.DETECTION,
          level: 1 
        } 
      ])
    })

    it('outpost tier 3 shows strategy and resources, tier 4 adds the outpost type', async () => {
      city = null
      outpost = OutpostEntity.create({
        id: 'outpost-id',
        player_id: target_owner_id,
        cell_id: destination_cell_id,
        type: OutpostType.PERMANENT,
        default_combat_strategy: null,
      })
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 4 }

      await run(0)
      let { metadata } = spyReport()
      assert.strictEqual(metadata.tier, 3)
      assert.strictEqual(metadata.target.kind, BattleTargetKind.OUTPOST)
      assert.strictEqual(metadata.target.name, null)
      assert.deepStrictEqual(intelKeys(metadata), [
        'default_strategy',
        'resources',
        'troops' 
      ])
      assert.strictEqual(metadata.default_strategy, CombatStrategy.BALANCED)

      createSpyReports.mockClear()
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 5 }
      await run(0)
      ;({ metadata } = spyReport())
      assert.deepStrictEqual(intelKeys(metadata), [
        'default_strategy',
        'outpost_type',
        'resources',
        'troops' 
      ])
      assert.strictEqual(metadata.outpost_type, OutpostType.PERMANENT)
    })

    it('field stack shows troops at any tier', async () => {
      city = null
      levels[spy_id] = { [TechnologyCode.ESPIONAGE]: 6 }

      await run(0)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.target.kind, BattleTargetKind.FIELD)
      assert.strictEqual(metadata.target.id, null)
      assert.deepStrictEqual(intelKeys(metadata), [ 'troops' ])
    })
  })

  describe('failure', () => {
    it('destroys all scouts and writes the spy and spy_detected reports', async () => {
      movement_troops = scouts(3)

      const result = await run(0.9)

      assert.strictEqual(result.outcome, 'failure')
      assert.strictEqual(troopDelete.mock.calls[0][0], 'scout-troop')
      assert.strictEqual(movementDelete.mock.calls[0][0], movement_id)
      assert.strictEqual(movementCreate.mock.calls.length, 0, 'no return trip')
      assert.strictEqual(scheduleTroopMovementFinish.mock.calls.length, 0)
      assert.strictEqual(explorationUpdateOne.mock.calls.length, 0)

      const { metadata } = spyReport()
      assert.strictEqual(metadata.success, false)
      assert.strictEqual(metadata.aborted, false)
      assert.strictEqual(metadata.roll, 0.9)
      assert.strictEqual(metadata.p_success, 0.84)
      assert.strictEqual(metadata.tier, 0)
      assert.strictEqual(metadata.scouts_lost, 3)
      assert.strictEqual(metadata.troops, undefined)

      const detected = reports().find(({ report }) => report.type === ReportType.SPY_DETECTED)
      assert.ok(detected)
      assert.strictEqual(detected.report.player_id, target_owner_id)
      assert.deepStrictEqual(detected.report.troops, [])
      assert.deepStrictEqual(detected.metadata as ReportSpyDetectedMetadata, {
        spy_owner: {
          name: 'Espion',
          faction_code: FactionCode.THE_CONFEDERATION,
        },
        target: metadata.target,
        scouts_destroyed: 3,
      })
    })
  })

  describe('vanished target', () => {
    it('returns the scouts without a roll when nothing is left to spy on', async () => {
      city = null
      cell_troops = []
      const random = vi.fn().mockReturnValue(0)

      const result = await finishTroopSpyMovement({
        player_id: spy_id,
        movement_id,
        arrived_at,
        random 
      })

      assert.strictEqual(result.outcome, 'aborted')
      assert.strictEqual(random.mock.calls.length, 0)
      const {
        metadata, target_player_id 
      } = spyReport()
      assert.strictEqual(target_player_id, null)
      assert.deepStrictEqual(metadata, {
        success: false,
        aborted: true,
        roll: null,
        p_success: null,
        tier: 0,
        target: {
          kind: null,
          id: null,
          name: null,
          owner_name: null,
          faction_code: null,
          coordinates: {
            x: 4,
            y: 4 
          },
        },
        scouts_lost: 0,
      })
      assert.strictEqual(reports().length, 1)
      assert.strictEqual(movementCreate.mock.calls[0][0].action, MovementAction.BASE)
      assert.strictEqual(troopDelete.mock.calls.length, 0)
      assert.strictEqual(explorationUpdateOne.mock.calls.length, 0)
    })

    it('returns the scouts without a roll when the target changed to a same-faction owner', async () => {
      target_faction = FactionCode.THE_CONFEDERATION
      const random = vi.fn().mockReturnValue(0)

      const result = await finishTroopSpyMovement({
        player_id: spy_id,
        movement_id,
        arrived_at,
        random 
      })

      assert.strictEqual(result.outcome, 'aborted')
      assert.strictEqual(random.mock.calls.length, 0)
      assert.strictEqual(spyReport().metadata.aborted, true)
      assert.strictEqual(movementCreate.mock.calls.length, 1)
    })
  })
})
