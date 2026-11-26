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
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'

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

  function setup({
    stock,
    transporters,
  }: {
    stock: ResourceStockEntity
    transporters: number
  }): void {
    const city = CityEntity.initCity({
      name: 'defender city',
      player_id: defender_player_id,
      cell_id: destination_cell.id,
    })
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id,
      defender_player_id,
      cell_id: destination_cell.id,
      target_kind: BattleTargetKind.CITY,
      target_id: city.id,
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
        defender_stacks: [],
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

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

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
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne,
      },
      city: {
        get: vi.fn().mockResolvedValue(city),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Repository)
  }

  beforeEach(() => {
    vi.mocked(createBattleReports).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loots half of plastic and mushroom but only a quarter of plasma', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 1000,
        mushroom: 1000,
        plasma: 1000,
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
    })
    assert.strictEqual(outcome.loot_applied, true)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 500)
    assert.strictEqual(updated_stock.mushroom, 500)
    assert.strictEqual(updated_stock.plasma, 750)
  })

  it('loots no plasma when plastic and mushroom exhaust carrier capacity', async () => {
    setup({
      stock: testResourceStock({
        cell_id: destination_cell.id,
        plastic: 12000,
        mushroom: 8000,
        plasma: 1000,
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
    })
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plasma, 1000)
  })
})
