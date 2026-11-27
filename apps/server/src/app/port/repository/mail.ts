import { GenericRepository } from '#app/port/repository/generic'
import { MailEntity } from '#core/communication/mail/entity'

export type MailBox = 'inbox' | 'sent'

export type MailRepository = GenericRepository<MailEntity> & {
  getById(id: string): Promise<MailEntity>

  /** Inbox: delivered letters not deleted by the recipient. Sent: letters not deleted by the sender. Newest first. */
  list(query: {
    player_id: string
    box: MailBox
    limit: number
    offset: number
  }): Promise<{ mails: MailEntity[]; total: number }>

  countUnread(player_id: string): Promise<number>

  /** Deletes letters both sides deleted (an undelivered letter only has a sender side). */
  deleteDeletedByBoth(): Promise<number>
}
