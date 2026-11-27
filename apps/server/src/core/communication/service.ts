import { CommunicationError } from '#core/communication/error'
import {
  ABUSE_REPORT_REASON_MAX_LENGTH,
  CHAT_BODY_MAX_LENGTH,
  MAIL_BODY_MAX_LENGTH,
  MAIL_SUBJECT_MAX_LENGTH
} from '#core/communication/constant/limits'
import {
  allianceChatChannelKey,
  ChatChannel
} from '#core/communication/chat/channel'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

const assertLength = ({
  value,
  max,
  error
}: {
  value: string
  max: number
  error: CommunicationError
}): void => {
  if (value.length < 1 || value.length > max) {
    throw new Error(error)
  }
}

export class CommunicationService {
  /** Trimmed subject, 1–120 characters. */
  static normalizeMailSubject(subject: unknown): string {
    const value = typeof subject === 'string' ? subject.trim() : ''
    assertLength({
      value,
      max: MAIL_SUBJECT_MAX_LENGTH,
      error: CommunicationError.SUBJECT_INVALID
    })
    return value
  }

  /** Body kept as typed (line breaks matter); 1–5000 characters and not blank. */
  static normalizeMailBody(body: unknown): string {
    const value = typeof body === 'string' ? body : ''
    assertLength({
      value,
      max: MAIL_BODY_MAX_LENGTH,
      error: CommunicationError.BODY_INVALID
    })
    if (value.trim().length === 0) {
      throw new Error(CommunicationError.BODY_INVALID)
    }
    return value
  }

  /** Trimmed chat body, 1–500 characters. */
  static normalizeChatBody(body: unknown): string {
    const value = typeof body === 'string' ? body.trim() : ''
    assertLength({
      value,
      max: CHAT_BODY_MAX_LENGTH,
      error: CommunicationError.BODY_INVALID
    })
    return value
  }

  /** Optional reason, trimmed; empty means none; at most 500 characters. */
  static normalizeAbuseReason(reason: unknown): string | null {
    if (reason === undefined || reason === null) {
      return null
    }
    if (typeof reason !== 'string') {
      throw new Error(CommunicationError.REASON_INVALID)
    }
    const value = reason.trim()
    if (value.length > ABUSE_REPORT_REASON_MAX_LENGTH) {
      throw new Error(CommunicationError.REASON_INVALID)
    }
    return value.length > 0 ? value : null
  }

  static assertMailRecipient({
    sender_id,
    recipient
  }: {
    sender_id: string
    recipient: PlayerEntity
  }): void {
    if (recipient.id === sender_id) {
      throw new Error(CommunicationError.RECIPIENT_IS_SELF)
    }
    if (recipient.system_controlled) {
      throw new Error(CommunicationError.RECIPIENT_SYSTEM)
    }
  }

  static assertBlockTarget({
    blocker_id,
    target
  }: {
    blocker_id: string
    target: PlayerEntity
  }): void {
    if (target.id === blocker_id || target.system_controlled) {
      throw new Error(CommunicationError.BLOCK_INVALID)
    }
  }

  /**
   * Whether a player may read and post in a stored channel key.
   * `alliance_id` is the player's current alliance (slice 033): leaving removes access immediately.
   */
  static canAccessChannel({
    player,
    channel_key,
    alliance_id = null
  }: {
    player: Pick<PlayerEntity, 'faction_code' | 'system_controlled'>
    channel_key: string | null
    alliance_id?: string | null
  }): boolean {
    if (player.system_controlled || channel_key === null) {
      return false
    }
    if (channel_key === ChatChannel.GLOBAL) {
      return true
    }
    if (alliance_id && channel_key === allianceChatChannelKey(alliance_id)) {
      return true
    }
    return channel_key === `${ChatChannel.FACTION}:${player.faction_code}`
  }

  /** Faction code of a `faction:<code>` key, `null` for `global`. */
  static channelFactionCode(channel_key: string): FactionCode | null {
    const prefix = `${ChatChannel.FACTION}:`
    return channel_key.startsWith(prefix) ? channel_key.slice(prefix.length) as FactionCode : null
  }

  static mailAbuseContent({
    subject, body 
  }: { subject: string, body: string }): string {
    return `${subject}\n\n${body}`
  }
}
