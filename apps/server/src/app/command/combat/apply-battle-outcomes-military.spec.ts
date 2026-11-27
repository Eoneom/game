import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import {
  testCityCell,
  testResourceStock
} from '#app/test-support/resource-stock'
import { CityEntity } from '#core/city/entity'
import { BattleEntity } from '#core/combat/entity/battle'
import {
  BattleCasualtyLine,
  BattleStack
} from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { TroopCode } from '#core/troop/constant/code'

vi.mock('#app/command/communication/report/create-battle', () => ({
  createBattleReports: vi.fn().mockResolvedValue({
    attacker_report_id: 'attacker-report',
    defender_report_id: 'defender-report',
    reinforcement_reports: [],
  }),
}))

const LEGIONNAIRE_VALUE = 2500
const TURRET_VALUE = 1600

describe('battle outcomes credit military value (slice 034)', () => {
  const destination_cell = testCityCell({ cell_id: 'city-cell' })
  const origin_cell = testCityCell({ cell_id: 'origin-cell' })
  const city = CityEntity.create({
    id: 'city-id',
    player_id: 'host',
    name: 'Bastion',
    cell_id: destination_cell.id,
  })

  let addMilitaryValue: MockInstance

  function setup({
    attacker_stacks,
    defender_stacks,
    cumulative_attacker_losses,
    cumulative_defender_losses,
    system_player_ids = [],
  }: {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    cumulative_attacker_losses: BattleCasualtyLine[]
    cumulative_defender_losses: BattleCasualtyLine[]
    system_player_ids?: string[]
  }): void {
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      cell_id: destination_cell.id,
      target_kind: BattleTargetKind.CITY,
      target_id: city.id,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      current_round: 2,
      status: 'in_progress',
      winner: null,
      state_json: {
        attacker_stacks,
        defender_stacks,
        attacker_origin: {
          x: 0,
          y: 0
        },
        cumulative_attacker_losses,
        cumulative_defender_losses,
      },
      round_summaries: [],
      started_at: 1000,
      finished_at: null,
    })

    addMilitaryValue = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ cancelDefenseBuildProgress: vi.fn().mockResolvedValue(undefined) } as unknown as JobQueue)
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
      cell: { getCell: vi.fn(async ({ coordinates }: { coordinates: { x: number } }) => coordinates.x === 0 ? origin_cell : destination_cell) },
      troop: {
        listAllInCell: vi.fn().mockResolvedValue([]),
        listByMovement: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id: destination_cell.id,
          plastic: 0,
          mushroom: 0,
        })),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      city: {
        get: vi.fn().mockResolvedValue(city),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      building: { getLevel: vi.fn().mockResolvedValue(0) },
      troop_recruit_queue: { deleteByCity: vi.fn().mockResolvedValue(undefined) },
      defense: {
        deleteByCity: vi.fn().mockResolvedValue(undefined),
        removeCount: vi.fn().mockResolvedValue(undefined),
      },
      defense_build_queue: { deleteByCity: vi.fn().mockResolvedValue(undefined) },
      player: {
        listByIds: vi.fn(async (ids: string[]) => ids.map(id => PlayerEntity.create({
          id,
          name: id,
          faction_code: FactionCode.THE_CONFEDERATION,
          system_controlled: system_player_ids.includes(id),
        }))),
        addMilitaryValue,
      },
    } as unknown as Repository)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('credits the attacker with defender troop and defense losses, and the host with attacker losses', async () => {
    setup({
      attacker_stacks: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 6
        } 
      ],
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3
        },
        {
          kind: 'defense',
          code: DefenseCode.TURRET,
          count: 1
        },
      ],
      cumulative_attacker_losses: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 4
        } 
      ],
      cumulative_defender_losses: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 2
        },
        {
          kind: 'defense',
          code: DefenseCode.TURRET,
          count: 2
        },
      ],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DEFENDER,
      finished_at: 2000,
    })

    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'attacker',
      value: 2 * LEGIONNAIRE_VALUE + 2 * TURRET_VALUE
    })
    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'host',
      value: 4 * 2500
    })
    expect(addMilitaryValue).toHaveBeenCalledTimes(2)
  })

  it('splits the defender credit with reinforcement owners by attack value', async () => {
    setup({
      attacker_stacks: [],
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3,
          player_id: 'ally'
        },
      ],
      cumulative_attacker_losses: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 2
        } 
      ],
      cumulative_defender_losses: [],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DEFENDER,
      finished_at: 2000,
    })

    // 5000 split 1 : 3 by legionnaire attack.
    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'host',
      value: 1250
    })
    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'ally',
      value: 3750
    })
  })

  it('credits the attacker with the defender stacks destroyed by the capture', async () => {
    setup({
      attacker_stacks: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 5
        } 
      ],
      defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 2
        } 
      ],
      cumulative_attacker_losses: [],
      cumulative_defender_losses: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1
        } 
      ],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 2000,
    })

    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'attacker',
      value: LEGIONNAIRE_VALUE + 2 * 1200
    })
    expect(addMilitaryValue).toHaveBeenCalledTimes(1)
  })

  it('never credits system players', async () => {
    setup({
      attacker_stacks: [],
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 2
        } 
      ],
      cumulative_attacker_losses: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 3
        } 
      ],
      cumulative_defender_losses: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1
        } 
      ],
      system_player_ids: [ 'attacker' ],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DEFENDER,
      finished_at: 2000,
    })

    expect(addMilitaryValue).toHaveBeenCalledTimes(1)
    expect(addMilitaryValue).toHaveBeenCalledWith({
      player_id: 'host',
      value: 3 * 2500
    })
  })

  it('does not touch counters when nothing was destroyed (counters never decrease)', async () => {
    setup({
      attacker_stacks: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 1
        } 
      ],
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1
        } 
      ],
      cumulative_attacker_losses: [],
      cumulative_defender_losses: [],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DRAW,
      finished_at: 2000,
    })

    expect(addMilitaryValue).not.toHaveBeenCalled()
  })
})
