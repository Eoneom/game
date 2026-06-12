import type { MockInstance } from 'vitest'
import { CommunicationGetReportQuery } from '#app/query/communication/report/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
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
})
