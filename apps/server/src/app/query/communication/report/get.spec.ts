import type { MockInstance } from 'vitest'
import { CommunicationGetReportQuery } from '#app/query/communication/report/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { CommunicationError } from '#core/communication/error'
import { FactionCode } from '#core/faction/constant/code'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { id } from '#shared/identification'

describe('CommunicationGetReportQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const report_id = id()
  let report: ReportEntity
  let repository: Pick<Repository, 'report'>

  beforeEach(() => {
    report = ReportEntity.create({
      id: report_id,
      player_id,
      destination: {
        x: 1,
        y: 1 },
      origin: {
        x: 0,
        y: 0 },
      troops: [],
      type: ReportType.EXPLORATION,
      recorded_at: 0,
      was_read: false
    })
    repository = { report: { getById: vi.fn().mockResolvedValue(report) } as unknown as Repository['report'] }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when report is not owned by player', async () => {
    const other = ReportEntity.create({
      ...report,
      player_id: other_player_id
    })
    ;(repository.report.getById as MockInstance).mockResolvedValue(other)

    await expect(new CommunicationGetReportQuery().run({
      player_id,
      report_id 
    })).rejects.toThrow(CommunicationError.REPORT_NOT_OWNER)
  })

  it('returns report', async () => {
    const result = await new CommunicationGetReportQuery().run({
      player_id,
      report_id 
    })

    expect(result.report).toBe(report)
    expect(repository.report.getById).toHaveBeenCalledWith(report_id)
  })

  describe('battle reports', () => {
    const battle_metadata = {
      battle_id: 'battle-id',
      movement_id: 'movement-id',
      perspective: ReportPerspective.ATTACKER,
      attacker_player_id: player_id,
      defender_player_id: other_player_id,
      attacker_faction_code: FactionCode.THE_CONFEDERATION,
      defender_faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      target_kind: BattleTargetKind.FIELD,
      target_id: null,
      winner: BattleWinner.ATTACKER,
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
      rounds_played: 1,
      outcome: {
        occupied: true,
        destroyed_temp_outpost: false,
        loot_applied: false,
        attacker_retreated: false,
      },
      casualties_attacker: [],
      casualties_defender: [],
      round_summaries: [],
    }

    function mockBattle(state_json: Record<string, unknown>) {
      const battle_report = ReportEntity.create({
        ...report,
        type: ReportType.BATTLE,
      })
      const battle_get = vi.fn().mockResolvedValue({ state_json })
      vi.spyOn(Factory, 'getRepository').mockReturnValue({
        report: {
          getById: vi.fn().mockResolvedValue(battle_report),
          getBattleMetadataByReportId: vi.fn().mockResolvedValue(battle_metadata),
        },
        battle: { getById: battle_get },
        player: { listByIds: vi.fn().mockResolvedValue([]) },
        alliance: { listTagsByPlayerIds: vi.fn().mockResolvedValue([]) },
      } as unknown as Repository)
      return battle_get
    }

    it('adds the modifiers snapshotted in battle state_json', async () => {
      const battle_get = mockBattle({
        attacker_modifiers: {
          attack: 1.09,
          life: 1.06
        },
        defender_modifiers: {
          attack: 1,
          life: 1.03
        },
      })

      const result = await new CommunicationGetReportQuery().run({
        player_id,
        report_id
      })

      expect(battle_get).toHaveBeenCalledWith('battle-id')
      expect(result.battle?.attacker_modifiers).toEqual({
        attack: 1.09,
        life: 1.06
      })
      expect(result.battle?.defender_modifiers).toEqual({
        attack: 1,
        life: 1.03
      })
    })

    it('defaults to neutral modifiers for battles started before slice 027', async () => {
      mockBattle({})

      const result = await new CommunicationGetReportQuery().run({
        player_id,
        report_id
      })

      expect(result.battle?.attacker_modifiers).toEqual({
        attack: 1,
        life: 1
      })
      expect(result.battle?.defender_modifiers).toEqual({
        attack: 1,
        life: 1
      })
    })
  })
})
