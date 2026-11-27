import { GenericQuery } from '#query/generic'
import { MailBox } from '#app/port/repository/mail'
import { getMailParticipants } from '#query/communication/mail/participants'
import { MailEntity } from '#core/communication/mail/entity'
import { PlayerEntity } from '#core/player/entity'

export const COMMUNICATION_LIST_MAIL_PAGE_SIZE = 10

interface CommunicationListMailQueryRequest {
  player_id: string
  box: MailBox
  page: number
}

interface CommunicationListMailQueryResponse {
  mails: MailEntity[]
  players: Map<string, PlayerEntity>
  total: number
}

const normalizePage = (page: number): number => {
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
}

export class CommunicationListMailQuery extends GenericQuery<CommunicationListMailQueryRequest, CommunicationListMailQueryResponse> {
  constructor() {
    super({ name: 'communication:mail:list' })
  }

  protected async get({
    player_id,
    box,
    page
  }: CommunicationListMailQueryRequest): Promise<CommunicationListMailQueryResponse> {
    const limit = COMMUNICATION_LIST_MAIL_PAGE_SIZE
    const {
      mails, total 
    } = await this.repository.mail.list({
      player_id,
      box,
      limit,
      offset: (normalizePage(page) - 1) * limit
    })
    const players = await getMailParticipants(this.repository, mails)

    return {
      mails,
      players,
      total
    }
  }
}
