import { GenericQuery } from '#query/generic'

interface CommunicationCountUnreadMailQueryRequest {
  player_id: string
}

export class CommunicationCountUnreadMailQuery extends GenericQuery<CommunicationCountUnreadMailQueryRequest, number> {
  constructor() {
    super({ name: 'communication:mail:count-unread' })
  }

  protected async get({ player_id }: CommunicationCountUnreadMailQueryRequest): Promise<number> {
    return this.repository.mail.countUnread(player_id)
  }
}
