import assert from 'node:assert/strict'
import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { createBattleReports } from '#app/command/communication/report/create-battle'
import { Repository } from '#app/port/repository/generic'
import {
  testCityCell, testResourceStock
} from '#app/test-support/resource-stock'
import { CityEntity } from '#core/city/entity'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopCode } from '#core/troop/constant/code'
import { BuildingCode } from '#core/building/constant/code'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import {
  BattleCasualtyLine, BattleStack 
} from '#core/combat/type/battle-stack'
import { DefenseCode } from '#core/defense/constant/code'
import { JobQueue } from '#app/port/job-queue'

vi.mock('#app/command/communication/report/create-battle', () => ({
  createBattleReports: vi.fn().mockResolvedValue({
    attacker_report_id: 'attacker-report-id',
    defender_report_id: 'defender-report-id',
  }),
}))

describe('applyBattleOutcomes loot', () => {
  const attacker_player_id = 'attacker-id'
  const defender_player_id = 'defender-id'
  const destination_cell = testCityCell({ cell_id: 'destination-cell-id' })
  const origin_cell = testCityCell({ cell_id: 'origin-cell-id' })
  let stockUpdateOne: MockInstance
  let queueDeleteByCity: MockInstance
  let exchangeListOpenByCity: MockInstance
  let buildingGetLevel: MockInstance
  let defenseDeleteByCity: MockInstance
  let defenseRemoveCount: MockInstance
  let defenseQueueDeleteByCity: MockInstance
  let cancelDefenseBuildProgress: MockInstance
  let cityUpdateOne: MockInstance
  let troopUpdateOne: MockInstance
  let city_id: string

  function setup({
    stock,
    transporters,
    shelter_level = 0,
    target_kind = BattleTargetKind.CITY,
    defender_stacks = [],
    cumulative_defender_losses = [],
  }: {
    stock: ResourceStockEntity
    transporters: number
    shelter_level?: number
    target_kind?: BattleTargetKind
    defender_stacks?: BattleStack[]
    cumulative_defender_losses?: BattleCasualtyLine[]
  }): void {
    const city = CityEntity.initCity({
      name: 'defender city',
      player_id: defender_player_id,
      cell_id: destination_cell.id,
    })
    city_id = city.id
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id,
      defender_player_id,
      cell_id: destination_cell.id,
      target_kind,
      target_id: target_kind === BattleTargetKind.FIELD ? null : city.id,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 1,
      status: 'in_progress',
      winner: null,
      state_json: {
        attacker_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 10
          },
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: transporters
          },
        ],
        defender_stacks,
        attacker_origin: {
          x: 0,
          y: 0
        },
        cumulative_attacker_losses: [],
        cumulative_defender_losses,
      },
      round_summaries: [],
      started_at: 1_000,
      finished_at: null,
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    queueDeleteByCity = vi.fn().mockResolvedValue(undefined)
    exchangeListOpenByCity = vi.fn().mockResolvedValue([])
    buildingGetLevel = vi.fn().mockResolvedValue(shelter_level)
    defenseDeleteByCity = vi.fn().mockResolvedValue(undefined)
    defenseRemoveCount = vi.fn().mockResolvedValue(undefined)
    defenseQueueDeleteByCity = vi.fn().mockResolvedValue(undefined)
    cancelDefenseBuildProgress = vi.fn().mockResolvedValue(undefined)
    cityUpdateOne = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ cancelDefenseBuildProgress } as unknown as JobQueue)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      battle: {
        getById: vi.fn().mockResolvedValue(battle),
        update: vi.fn().mockResolvedValue(undefined),
      },
      movement: {
        getById: vi.fn().mockResolvedValue({
          origin: {
            x: 0,
            y: 0
          },
          destination: {
            x: 1,
            y: 1
          },
        }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      cell: { getCell: vi.fn().mockImplementation(async ({ coordinates }: { coordinates: { x: number } }) => coordinates.x === 0 ? origin_cell : destination_cell) },
      troop: {
        listAllInCell: vi.fn().mockResolvedValue([]),
        listByMovement: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
        updateOne: troopUpdateOne,
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne,
      },
      city: {
        get: vi.fn().mockResolvedValue(city),
        updateOne: cityUpdateOne,
      },
      building: { getLevel: buildingGetLevel },
      troop_recruit_queue: { deleteByCity: queueDeleteByCity },
      defense: {
        deleteByCity: defenseDeleteByCity,
        removeCount: defenseRemoveCount,
      },
      defense_build_queue: { deleteByCity: defenseQueueDeleteByCity },
      exchange: { listOpenByCityForUpdate: exchangeListOpenByCity },
      player: {
        listByIds: vi.fn().mockResolvedValue([]),
        addMilitaryValue: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Repository)
  }

  beforeEach(() => {
    vi.mocked(createBattleReports).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loots half of plastic and mushroom but only a quarter of plasma and water', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 1000,
        mushroom: 1000,
        plasma: 1000,
        water: 1000,
      }),
      transporters: 1,
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 5_000,
    })

    const {
      loot, outcome
    } = vi.mocked(createBattleReports).mock.calls[0][0]
    assert.deepStrictEqual(loot, {
      plastic: 500,
      mushroom: 500,
      plasma: 250,
      water: 250,
    })
    assert.strictEqual(outcome.loot_applied, true)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 500)
    assert.strictEqual(updated_stock.mushroom, 500)
    assert.strictEqual(updated_stock.plasma, 750)
    assert.strictEqual(updated_stock.water, 750)
  })

  it('loots water alone when it is the only stock (slice 035)', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 0,
        mushroom: 0,
        water: 400,
      }),
      transporters: 1,
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 5_000,
    })

    const {
      loot, outcome
    } = vi.mocked(createBattleReports).mock.calls[0][0]
    assert.deepStrictEqual(loot, {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
      water: 100,
    })
    assert.strictEqual(outcome.loot_applied, true)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].water, 300)
  })

  it('loots no plasma nor water when plastic and mushroom exhaust carrier capacity', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 12000,
        mushroom: 8000,
        plasma: 1000,
        water: 1000,
      }),
      transporters: 1,
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 5_000,
    })

    const { loot } = vi.mocked(createBattleReports).mock.calls[0][0]
    assert.deepStrictEqual(loot, {
      plastic: 6000,
      mushroom: 4000,
      plasma: 0,
      water: 0,
    })
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plasma, 1000)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].water, 1000)
  })

  describe('underground shelter', () => {
    it('loots the same as before at shelter level 0', async () => {
      setup({
        stock: testResourceStock({
          cell_id: destination_cell.id,
          plastic: 1000,
          mushroom: 1000,
          plasma: 1000,
        }),
        transporters: 1,
        shelter_level: 0,
      })

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.ATTACKER,
        finished_at: 5_000,
      })

      const {
        loot,
        sheltered,
      } = vi.mocked(createBattleReports).mock.calls[0][0]
      assert.deepStrictEqual(loot, {
        plastic: 500,
        mushroom: 500,
        plasma: 250,
        water: 0,
      })
      assert.deepStrictEqual(sheltered, {
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water: 0,
      })
    })

    it('loses at most half of the unsheltered part at level 1 (3000 plastic → 500)', async () => {
      setup({
        stock: testResourceStock({
          cell_id: destination_cell.id,
          plastic: 3000,
          mushroom: 1000,
          plasma: 1000,
          water: 1000,
        }),
        transporters: 1,
        shelter_level: 1,
      })

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.ATTACKER,
        finished_at: 5_000,
      })

      const {
        loot,
        sheltered,
      } = vi.mocked(createBattleReports).mock.calls[0][0]
      // plastic: (3000 − 2000) × 50 %, mushroom fully sheltered (1500), plasma: (1000 − 200) × 25 %,
      // water: (1000 − 100) × 25 % (slice 035).
      assert.deepStrictEqual(loot, {
        plastic: 500,
        mushroom: 0,
        plasma: 200,
        water: 225,
      })
      assert.deepStrictEqual(sheltered, {
        plastic: 2000,
        mushroom: 1000,
        plasma: 200,
        water: 100,
      })
      expect(buildingGetLevel).toHaveBeenCalledWith({
        city_id,
        code: BuildingCode.UNDERGROUND_SHELTER,
      })
      const updated_stock = stockUpdateOne.mock.calls[0][0]
      assert.strictEqual(updated_stock.plastic, 2500)
      assert.strictEqual(updated_stock.mushroom, 1000)
      assert.strictEqual(updated_stock.plasma, 800)
      assert.strictEqual(updated_stock.water, 775)
    })

    it('does not shelter outposts', async () => {
      setup({
        stock: testResourceStock({
          cell_id: destination_cell.id,
          plastic: 3000,
          mushroom: 0,
          plasma: 0,
        }),
        transporters: 1,
        shelter_level: 5,
        target_kind: BattleTargetKind.OUTPOST,
      })
      vi.mocked(Factory.getRepository)().outpost = {
        getById: vi.fn().mockResolvedValue({
          id: 'outpost-id',
          type: 'permanent',
          player_id: defender_player_id,
          cell_id: destination_cell.id,
        }),
        updateOne: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as unknown as Repository['outpost']

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.ATTACKER,
        finished_at: 5_000,
      })

      const {
        loot,
        sheltered,
      } = vi.mocked(createBattleReports).mock.calls[0][0]
      assert.strictEqual(loot.plastic, 1500)
      assert.deepStrictEqual(sheltered, {
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water: 0,
      })
      expect(buildingGetLevel).not.toHaveBeenCalled()
    })
  })

  it('clears the waiting recruitment queue of a captured city', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 0,
        mushroom: 0,
        plasma: 0,
      }),
      transporters: 0,
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 5_000,
    })

    expect(queueDeleteByCity).toHaveBeenCalledWith({ city_id })
  })

  it('cancels the open exchange orders of a captured city only (slice 035)', async () => {
    const empty = () => testResourceStock({
      cell_id: destination_cell.id,
      plastic: 0,
      mushroom: 0,
      plasma: 0,
    })
    setup({
      stock: empty(),
      transporters: 0,
    })
    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 5_000,
    })
    expect(exchangeListOpenByCity).toHaveBeenCalledWith(city_id)

    setup({
      stock: empty(),
      transporters: 0,
    })
    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DEFENDER,
      finished_at: 5_000,
    })
    expect(exchangeListOpenByCity).not.toHaveBeenCalled()
  })

  describe('city defenses', () => {
    const empty_stock = () => testResourceStock({
      cell_id: destination_cell.id,
      plastic: 0,
      mushroom: 0,
      plasma: 0,
    })

    it('deletes every defense, the fortification queue and batch before the capture on attacker win', async () => {
      setup({
        stock: empty_stock(),
        transporters: 0,
        defender_stacks: [
          {
            kind: 'defense',
            code: DefenseCode.RAMPART,
            count: 4 
          } 
        ],
      })

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.ATTACKER,
        finished_at: 5_000,
      })

      expect(defenseDeleteByCity).toHaveBeenCalledWith({ city_id })
      expect(defenseQueueDeleteByCity).toHaveBeenCalledWith({ city_id })
      expect(cancelDefenseBuildProgress).toHaveBeenCalledWith({ city_id })
      expect(defenseDeleteByCity.mock.invocationCallOrder[0]).toBeLessThan(cityUpdateOne.mock.invocationCallOrder[0])
      expect(defenseRemoveCount).not.toHaveBeenCalled()
    })

    it('keeps surviving defenses on a draw and removes only the lost units', async () => {
      setup({
        stock: empty_stock(),
        transporters: 0,
        defender_stacks: [
          {
            code: TroopCode.WAR_MACHINE,
            count: 2 
          },
          {
            kind: 'defense',
            code: DefenseCode.TURRET,
            count: 3 
          },
        ],
        cumulative_defender_losses: [
          {
            code: TroopCode.WAR_MACHINE,
            count: 1 
          },
          {
            kind: 'defense',
            code: DefenseCode.RAMPART,
            count: 5 
          },
          {
            kind: 'defense',
            code: DefenseCode.MINEFIELD,
            count: 2 
          },
        ],
      })

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.DRAW,
        finished_at: 5_000,
      })

      expect(defenseDeleteByCity).not.toHaveBeenCalled()
      expect(defenseRemoveCount).toHaveBeenCalledTimes(2)
      expect(defenseRemoveCount).toHaveBeenCalledWith({
        city_id,
        code: DefenseCode.RAMPART,
        count: 5 
      })
      expect(defenseRemoveCount).toHaveBeenCalledWith({
        city_id,
        code: DefenseCode.MINEFIELD,
        count: 2 
      })
      // Defense survivors stay in their rows: only troops are written back as troop rows.
      const written_codes = troopUpdateOne.mock.calls.map(([ troop ]) => troop.code)
      assert.ok(written_codes.includes(TroopCode.WAR_MACHINE))
      assert.ok(!written_codes.includes(DefenseCode.TURRET))
    })

    it('persists defense losses when the defender wins', async () => {
      setup({
        stock: empty_stock(),
        transporters: 0,
        defender_stacks: [
          {
            kind: 'defense',
            code: DefenseCode.TURRET,
            count: 3 
          } 
        ],
        cumulative_defender_losses: [
          {
            kind: 'defense',
            code: DefenseCode.TURRET,
            count: 1 
          } 
        ],
      })

      await applyBattleOutcomes({
        battle_id: 'battle-id',
        winner: BattleWinner.DEFENDER,
        finished_at: 5_000,
      })

      expect(defenseRemoveCount).toHaveBeenCalledWith({
        city_id,
        code: DefenseCode.TURRET,
        count: 1 
      })
      expect(defenseDeleteByCity).not.toHaveBeenCalled()
    })
  })
})
