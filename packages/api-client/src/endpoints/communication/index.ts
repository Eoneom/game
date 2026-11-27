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
import {
  CommunicationSendMailRequest,
  CommunicationSendMailResponse
} from './mail/send'
import {
  CommunicationListMailRequest,
  CommunicationListMailResponse
} from './mail/list'
import {
  CommunicationGetMailRequest,
  CommunicationGetMailResponse
} from './mail/get'
import { CommunicationCountUnreadMailResponse } from './mail/count-unread'
import {
  CommunicationMarkMailRequest,
  CommunicationMarkMailResponse
} from './mail/mark'
import {
  CommunicationDeleteMailRequest,
  CommunicationDeleteMailResponse
} from './mail/delete'
import {
  CommunicationChatHistoryRequest,
  CommunicationChatHistoryResponse
} from './chat/history'
import {
  CommunicationPostChatMessageRequest,
  CommunicationPostChatMessageResponse
} from './chat/post'
import {
  CommunicationBlockPlayerRequest,
  CommunicationBlockPlayerResponse
} from './block/create'
import {
  CommunicationUnblockPlayerRequest,
  CommunicationUnblockPlayerResponse
} from './block/delete'
import { CommunicationListBlockResponse } from './block/list'
import {
  CommunicationCreateAbuseReportRequest,
  CommunicationCreateAbuseReportResponse
} from './abuse-report/create'

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

  public sendMail(token: string, body: CommunicationSendMailRequest): Promise<CommunicationSendMailResponse> {
    return this.fetcher.post('/communication/mail', {
      body,
      token
    })
  }

  public listMail(
    token: string,
    { box = 'inbox', page = 1 }: CommunicationListMailRequest = {}
  ): Promise<CommunicationListMailResponse> {
    return this.fetcher.get('/communication/mail', {
      token,
      searchParams: {
        box,
        page
      }
    })
  }

  public getMail(token: string, { mail_id }: CommunicationGetMailRequest): Promise<CommunicationGetMailResponse> {
    return this.fetcher.get(`/communication/mail/${mail_id}`, { token })
  }

  public countUnreadMail(token: string): Promise<CommunicationCountUnreadMailResponse> {
    return this.fetcher.get('/communication/mail/unread/count', { token })
  }

  public markMail(token: string, body: CommunicationMarkMailRequest): Promise<CommunicationMarkMailResponse> {
    return this.fetcher.put('/communication/mail/mark', {
      body,
      token
    })
  }

  public deleteMail(token: string, { mail_id }: CommunicationDeleteMailRequest): Promise<CommunicationDeleteMailResponse> {
    return this.fetcher.delete(`/communication/mail/${mail_id}`, { token })
  }

  public getChatHistory(
    token: string,
    { channel, before, limit }: CommunicationChatHistoryRequest
  ): Promise<CommunicationChatHistoryResponse> {
    return this.fetcher.get(`/communication/chat/${channel}`, {
      token,
      searchParams: {
        ...(before ? { before } : {}),
        ...(limit !== undefined ? { limit } : {})
      }
    })
  }

  public postChatMessage(
    token: string,
    { channel, body }: CommunicationPostChatMessageRequest
  ): Promise<CommunicationPostChatMessageResponse> {
    return this.fetcher.post(`/communication/chat/${channel}`, {
      body: { body },
      token
    })
  }

  public blockPlayer(token: string, body: CommunicationBlockPlayerRequest): Promise<CommunicationBlockPlayerResponse> {
    return this.fetcher.post('/communication/block', {
      body,
      token
    })
  }

  public unblockPlayer(token: string, { player_id }: CommunicationUnblockPlayerRequest): Promise<CommunicationUnblockPlayerResponse> {
    return this.fetcher.delete(`/communication/block/${player_id}`, { token })
  }

  public listBlockedPlayers(token: string): Promise<CommunicationListBlockResponse> {
    return this.fetcher.get('/communication/block', { token })
  }

  public reportAbuse(token: string, body: CommunicationCreateAbuseReportRequest): Promise<CommunicationCreateAbuseReportResponse> {
    return this.fetcher.post('/communication/abuse-report', {
      body,
      token
    })
  }
}
