import type { ChatChannel } from '@server-core/communication/chat/channel'
import type { CommunicationChatMessage } from './endpoints/communication/chat/shared'

export { AppEvent } from '@server-core/events'

export type BattleFinishedEventPayload = {
  player_id: string
  report_id: string
  perspective: 'attacker' | 'defender'
  winner: 'attacker' | 'defender' | 'draw'
}

/** Sent to the recipient when a letter is delivered (slice 032). */
export type MailReceivedEventPayload = {
  mail_id: string
}

/** Sent to every connected player allowed in the channel, except players who blocked the author (slice 032). */
export type ChatMessageEventPayload = {
  channel: ChatChannel
  message: CommunicationChatMessage
}

/** Sent to the defender when an attack is launched at them and their `detection` ≥ 1 (slice 030). */
export type MovementIncomingEventPayload = {
  player_id: string
  movement_id: string
  arrive_at: number
}
