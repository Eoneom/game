import { CommunicationMailItem } from '@eoneom/api-client/src/endpoints/communication/mail/shared'
import { MailEntity } from '#core/communication/mail/entity'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'

const participant = (players: Map<string, PlayerEntity>, player_id: string): CommunicationMailItem['sender'] => {
  const player = players.get(player_id)
  if (!player) {
    throw new Error(PlayerError.NOT_FOUND)
  }
  return {
    id: player.id,
    name: player.name,
    faction_code: player.faction_code
  }
}

/** The sender never sees read state or delivery (a blocked letter must look sent). */
export const mapMailItem = ({
  mail,
  players,
  player_id
}: {
  mail: MailEntity
  players: Map<string, PlayerEntity>
  player_id: string
}): CommunicationMailItem => ({
  id: mail.id,
  subject: mail.subject,
  sender: participant(players, mail.sender_id),
  recipient: participant(players, mail.recipient_id),
  sent_at: mail.sent_at,
  was_read: mail.recipient_id === player_id ? mail.read_at !== null : true,
  in_reply_to: mail.in_reply_to
})
