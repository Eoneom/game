import { CommunicationGetReportQuery } from '#app/query/communication/report/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { FactionCode } from '#core/faction/constant/code'

describe('CommunicationGetReportQuery spy reports (slice 030)', () => {
  const player_id = 'player-id'
  const report_id = 'report-id'
  const target = {
    kind: BattleTargetKind.CITY,
    id: 'city-id',
    name: 'Bastion',
    owner_name: 'Cible',
    faction_code: FactionCode.THE_ASH_LITURGY,
    coordinates: {
      x: 1,
      y: 1
    },
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockSpy(type: ReportType, metadata: Record<string, unknown>) {
    const getSpyMetadataByReportId = vi.fn().mockResolvedValue(metadata)
    const getBattleMetadataByReportId = vi.fn()
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      report: {
        getById: vi.fn().mockResolvedValue(ReportEntity.create({
          id: report_id,
          player_id,
          destination: {
            x: 1,
            y: 1
          },
          origin: {
            x: 0,
            y: 0
          },
          troops: [],
          type,
          recorded_at: 0,
          was_read: false
        })),
        getSpyMetadataByReportId,
        getBattleMetadataByReportId,
      },
    } as unknown as Repository)
    return {
      getSpyMetadataByReportId,
      getBattleMetadataByReportId
    }
  }

  it('returns spy metadata for a spy report', async () => {
    const metadata = {
      success: true,
      aborted: false,
      roll: 0.2,
      p_success: 0.65,
      tier: 1,
      target,
      scouts_lost: 0,
      troops: [],
    }
    const {
      getSpyMetadataByReportId,
      getBattleMetadataByReportId
    } = mockSpy(ReportType.SPY, metadata)

    const result = await new CommunicationGetReportQuery().run({
      player_id,
      report_id
    })

    expect(getSpyMetadataByReportId).toHaveBeenCalledWith(report_id)
    expect(getBattleMetadataByReportId).not.toHaveBeenCalled()
    expect(result.spy).toEqual(metadata)
    expect(result.spy_detected).toBeUndefined()
    expect(result.battle).toBeUndefined()
  })

  it('returns spy_detected metadata for the target', async () => {
    const metadata = {
      spy_owner: {
        name: 'Espion',
        faction_code: FactionCode.THE_CONFEDERATION
      },
      target,
      scouts_destroyed: 3,
    }
    mockSpy(ReportType.SPY_DETECTED, metadata)

    const result = await new CommunicationGetReportQuery().run({
      player_id,
      report_id
    })

    expect(result.spy_detected).toEqual(metadata)
    expect(result.spy).toBeUndefined()
  })
})
