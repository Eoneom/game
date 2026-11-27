import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { advanceCombatRound } from '#app/command/combat/advance-round'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'
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
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { ReportEntity } from '#core/communication/report/entity'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'

describe('battle outcomes with reinforcements (slice 033)', () => {
  const destination_cell = testCityCell({ cell_id: 'city-cell' })
  const origin_cell = testCityCell({ cell_id: 'origin-cell' })
  const city = CityEntity.create({
    id: 'city-id',
    player_id: 'host',
    name: 'Bastion',
    cell_id: destination_cell.id,
  })
  const on_cell = [
    TroopEntity.create({
      id: 'host-legion',
      player_id: 'host',
      cell_id: destination_cell.id,
      code: TroopCode.LEGIONNAIRE,
      count: 10,
      movement_id: null 
    }),
    TroopEntity.create({
      id: 'ally-legion',
      player_id: 'ally',
      cell_id: destination_cell.id,
      code: TroopCode.LEGIONNAIRE,
      count: 6,
      movement_id: null 
    }),
  ]

  let troopUpdateOne: MockInstance
  let troopDelete: MockInstance
  let createBattleReports: MockInstance
  let getByCellId: MockInstance

  function setup({
    attacker_stacks,
    defender_stacks,
    cumulative_defender_losses,
  }: {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    cumulative_defender_losses: BattleCasualtyLine[]
  }): BattleEntity {
    const battle = BattleEntity.create({
      id: 'battle-id',
      movement_id: 'movement-id',
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      cell_id: destination_cell.id,
      target_kind: BattleTargetKind.CITY,
      target_id: city.id,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.HOLD_THE_LINE,
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
        cumulative_attacker_losses: [
          {
            code: TroopCode.PENITENT_HORDE,
            count: 5 
          } 
        ],
        cumulative_defender_losses,
        defender_owner_modifiers: {
          ally: {
            attack: 1.3,
            life: 1.2 
          } 
        },
      },
      round_summaries: [],
      started_at: 1000,
      finished_at: null,
    })

    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    troopDelete = vi.fn().mockResolvedValue(undefined)
    createBattleReports = vi.fn().mockResolvedValue(undefined)
    getByCellId = vi.fn().mockResolvedValue(testResourceStock({
      cell_id: destination_cell.id,
      plastic: 1000,
      mushroom: 1000,
    }))

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      cancelDefenseBuildProgress: vi.fn().mockResolvedValue(undefined),
      scheduleCombatRoundAdvance: vi.fn().mockResolvedValue('job'),
    } as unknown as JobQueue)
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
        listAllInCell: vi.fn().mockResolvedValue(on_cell),
        listByMovement: vi.fn().mockResolvedValue([]),
        delete: troopDelete,
        updateOne: troopUpdateOne,
      },
      resource_stock: {
        getByCellId,
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
      exchange: { listOpenByCityForUpdate: vi.fn().mockResolvedValue([]) },
      player: {
        get: vi.fn(async (id: string) => ({
          id,
          faction_code: id === 'attacker' ? FactionCode.THE_ASH_LITURGY : FactionCode.THE_CONFEDERATION
        })),
        listByIds: vi.fn().mockResolvedValue([]),
        addMilitaryValue: vi.fn().mockResolvedValue(undefined),
      },
      report: { createBattleReports },
    } as unknown as Repository)
    return battle
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives survivors back to their owner and a reinforcement report with their own losses', async () => {
    setup({
      attacker_stacks: [],
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 8 
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3,
          player_id: 'ally' 
        },
      ],
      cumulative_defender_losses: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 2 
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3,
          player_id: 'ally' 
        },
      ],
    })

    const result = await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.DEFENDER,
      finished_at: 2000,
    })

    expect(troopDelete).toHaveBeenCalledWith('host-legion')
    expect(troopDelete).toHaveBeenCalledWith('ally-legion')
    const recreated = troopUpdateOne.mock.calls.map(call => call[0] as TroopEntity)
    expect(recreated.map(troop => [
      troop.player_id,
      troop.cell_id,
      troop.code,
      troop.count 
    ])).toEqual([
      [
        'host',
        destination_cell.id,
        TroopCode.LEGIONNAIRE,
        8 
      ],
      [
        'ally',
        destination_cell.id,
        TroopCode.LEGIONNAIRE,
        3 
      ],
    ])

    const call = createBattleReports.mock.calls[0][0] as {
      defender_report: ReportEntity
      reinforcement_reports: { report: ReportEntity, metadata: { perspective: ReportPerspective } }[]
    }
    expect(call.defender_report.troops).toEqual([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 2 
      } 
    ])
    expect(call.reinforcement_reports).toHaveLength(1)
    expect(call.reinforcement_reports[0].report).toMatchObject({
      player_id: 'ally',
      troops: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3 
        } 
      ],
    })
    expect(call.reinforcement_reports[0].metadata.perspective).toBe(ReportPerspective.REINFORCEMENT)
    expect(result.reinforcement_reports).toEqual([
      {
        player_id: 'ally',
        report_id: call.reinforcement_reports[0].report.id
      },
    ])
  })

  it('destroys the reinforcements with the garrison on an attacker win and loots the host stock only', async () => {
    setup({
      attacker_stacks: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 20 
        },
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 5 
        },
      ],
      defender_stacks: [],
      cumulative_defender_losses: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 10 
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 6,
          player_id: 'ally' 
        },
      ],
    })

    await applyBattleOutcomes({
      battle_id: 'battle-id',
      winner: BattleWinner.ATTACKER,
      finished_at: 2000,
    })

    expect(troopDelete).toHaveBeenCalledWith('ally-legion')
    const recreated = troopUpdateOne.mock.calls.map(call => call[0] as TroopEntity)
    expect(recreated.every(troop => troop.player_id === 'attacker')).toBe(true)
    expect(getByCellId).toHaveBeenCalledTimes(1)
    expect(getByCellId).toHaveBeenCalledWith({ cell_id: destination_cell.id })
    const call = createBattleReports.mock.calls[0][0] as { reinforcement_reports: { report: ReportEntity }[] }
    expect(call.reinforcement_reports[0].report.troops).toEqual([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 6 
      } 
    ])
  })

  it('emits battle:finished to each reinforcement owner', async () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    setup({
      attacker_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1 
        } 
      ],
      defender_stacks: [
        {
          code: TroopCode.WAR_MACHINE,
          count: 20 
        },
        {
          code: TroopCode.WAR_MACHINE,
          count: 20,
          player_id: 'ally' 
        },
      ],
      cumulative_defender_losses: [],
    })

    await advanceCombatRound({
      battle_id: 'battle-id',
      round: 3,
      advanced_at: 3000,
    })

    const finished = emit.mock.calls.filter(call => call[0] === AppEvent.BattleFinished).map(call => call[1])
    expect(finished.map(payload => [
      payload.player_id,
      payload.perspective 
    ])).toEqual([
      [
        'attacker',
        ReportPerspective.ATTACKER 
      ],
      [
        'host',
        ReportPerspective.DEFENDER 
      ],
      [
        'ally',
        ReportPerspective.REINFORCEMENT 
      ],
    ])
  })
})
