import { CommunicationCountUnreadReportQuery } from '#app/query/communication/report/count-unread'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { id } from '#shared/identification'

describe('CommunicationCountUnreadReportQuery', () => {
  const player_id = id()
  let repository: Pick<Repository, 'report'>

  beforeEach(() => {
    repository = { report: { count: vi.fn().mockResolvedValue(7) } as unknown as Repository['report'] }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns unread count from repository', async () => {
    const result = await new CommunicationCountUnreadReportQuery().run({ player_id })

    expect(result.count).toBe(7)
    expect(repository.report.count).toHaveBeenCalledWith({
      player_id,
      was_read: false
    })
  })
})
