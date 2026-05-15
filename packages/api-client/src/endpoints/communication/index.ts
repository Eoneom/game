import { Fetcher } from '../../fetcher'
import { CommunicationCountUnreadReportResponse } from './report/count-unread'
import {
  CommunicationGetReportRequest,
  CommunicationGetReportResponse
} from './report/get'
import {
  CommunicationListReportRequest,
  CommunicationListReportResponse
} from './report/list'
import {
  CommunicationMarkReportRequest, CommunicationMarkReportResponse
} from './report/mark'
import { CommunicationMarkAllReportsResponse } from './report/mark-all'

export class CommunicationEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public listReport(
    token: string,
    { page = 1, was_read }: CommunicationListReportRequest = {}
  ): Promise<CommunicationListReportResponse> {
    return this.fetcher.get('/communication/report', {
      token,
      searchParams: {
        page,
        ...(was_read !== undefined ? { was_read: was_read ? 'true' : 'false' } : {})
      }
    })
  }

  public getReport(token: string, { report_id }: CommunicationGetReportRequest): Promise<CommunicationGetReportResponse> {
    return this.fetcher.get(`/communication/report/${report_id}`, { token })
  }

  public countUnread(token: string): Promise<CommunicationCountUnreadReportResponse> {
    return this.fetcher.get('/communication/report/unread/count', { token })
  }

  public markReport(token: string, body: CommunicationMarkReportRequest): Promise<CommunicationMarkReportResponse> {
    return this.fetcher.put('/communication/report/mark', {
      body,
      token
    })
  }

  public markAllReports(token: string): Promise<CommunicationMarkAllReportsResponse> {
    return this.fetcher.put('/communication/report/mark-all', {
      token
    })
  }
}
