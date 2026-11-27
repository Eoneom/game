import type { ChatChannel } from '@server-core/communication/chat/channel'
import type { CommunicationChatMessage } from './endpoints/communication/chat/shared'

export { AppEvent } from '@server-core/events'

export type BattleFinishedEventPayload = {
  player_id: string
  report_id: string
  /** `reinforcement`: the player's troops were stationed in the attacked allied city (slice 033). */
  perspective: 'attacker' | 'defender' | 'reinforcement'
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

/** Membership, role or description change, sent to every member (slice 033). */
export type AllianceUpdatedEventPayload = {
  alliance_id: string
}

/** Sent to the invited player (slice 033). */
export type AllianceInvitationReceivedEventPayload = {
  invitation_id: string
  alliance_id: string
}

/** Sent to the chef and officers (slice 033). */
export type AllianceApplicationReceivedEventPayload = {
  application_id: string
  alliance_id: string
}

/** Sent to the player who joined (slice 033). */
export type AllianceJoinedEventPayload = {
  alliance_id: string
}

/** Sent to the player who left, was kicked, or whose alliance was dissolved (slice 033). */
export type AllianceLeftEventPayload = {
  alliance_id: string
  reason: 'leave' | 'kick' | 'dissolve'
}

/** Sent to the host when allied troops are stationed in their city (slice 033). */
export type ReinforcementArrivedEventPayload = {
  city_id: string
  owner_player_id: string
  report_id: string
}

/** Sent to the host when stationed troops leave (owner recall or automatic return, slice 033). */
export type ReinforcementRecalledEventPayload = {
  city_id: string
  owner_player_id: string
  movement_id: string
}
