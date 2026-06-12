import { CommunicationListReportQuery } from '#app/query/communication/report/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { id } from '#shared/identification'

describe('CommunicationListReportQuery', () => {
  const player_id = id()
  const report_id = id()
  let reports: ReportEntity[]
  let repository: Pick<Repository, 'report'>

  beforeEach(() => {
    reports = [
      ReportEntity.create({
        id: report_id,
        player_id,
        destination: {
          x: 1,
          y: 1 },
        origin: {
          x: 0,
          y: 0 },
        troops: [],
        type: ReportType.BASE,
        recorded_at: 1,
        was_read: true
      })
    ]
    repository = {
      report: {
        list: vi.fn().mockResolvedValue({
          reports,
          total: reports.length 
        }) 
      } as unknown as Repository['report']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns reports for player on page 1', async () => {
    const result = await new CommunicationListReportQuery().run({
      player_id,
      page: 1 
    })

    expect(result.reports).toBe(reports)
    expect(result.total).toBe(reports.length)
    expect(repository.report.list).toHaveBeenCalledWith({
      player_id,
      limit: 10,
      offset: 0 
    })
  })

  it('uses offset for page 2', async () => {
    await new CommunicationListReportQuery().run({
      player_id,
      page: 2 
    })

    expect(repository.report.list).toHaveBeenCalledWith({
      player_id,
      limit: 10,
      offset: 10 
    })
  })

  it('forwards was_read filter to repository', async () => {
    await new CommunicationListReportQuery().run({
      player_id,
      page: 1,
      was_read: false
    })

    expect(repository.report.list).toHaveBeenCalledWith({
      player_id,
      limit: 10,
      offset: 0,
      was_read: false
    })
  })
})
