import { GenericQuery } from '#query/generic'
import { getMailParticipants } from '#query/communication/mail/participants'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'
import { PlayerEntity } from '#core/player/entity'
import { now } from '#shared/time'

interface CommunicationGetMailQueryRequest {
  player_id: string
  mail_id: string
}

interface CommunicationGetMailQueryResponse {
  mail: MailEntity
  players: Map<string, PlayerEntity>
}

/** Letter detail; opening it marks it read when the caller is the recipient (spec 032). */
export class CommunicationGetMailQuery extends GenericQuery<CommunicationGetMailQueryRequest, CommunicationGetMailQueryResponse> {
  constructor() {
    super({ name: 'communication:mail:get' })
  }

  protected async get({
    player_id,
    mail_id
  }: CommunicationGetMailQueryRequest): Promise<CommunicationGetMailQueryResponse> {
    let mail = await this.repository.mail.getById(mail_id)
    if (!mail.isVisibleTo(player_id)) {
      throw new Error(CommunicationError.MAIL_NOT_OWNER)
    }

    if (mail.isVisibleToRecipient(player_id) && mail.read_at === null) {
      mail = mail.markAs({
        read: true,
        at: now()
      })
      await this.repository.mail.updateOne(mail)
    }

    return {
      mail,
      players: await getMailParticipants(this.repository, [ mail ])
    }
  }
}
