import { Repository } from '#app/port/repository/generic'
import { MailEntity } from '#core/communication/mail/entity'
import { PlayerEntity } from '#core/player/entity'

/** Sender and recipient players of a set of letters, by id. */
export const getMailParticipants = async (
  repository: Repository,
  mails: MailEntity[]
): Promise<Map<string, PlayerEntity>> => {
  const ids = [
    ...new Set(mails.flatMap(mail => [
      mail.sender_id,
      mail.recipient_id
    ])) 
  ]
  const players = await repository.player.listByIds(ids)
  return new Map(players.map(player => [
    player.id,
    player
  ]))
}
