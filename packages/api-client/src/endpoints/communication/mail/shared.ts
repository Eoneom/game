import { FactionCode } from '@server-core/faction/constant/code'

export interface CommunicationMailParticipant {
  id: string
  name: string
  faction_code: FactionCode
}

/** A Letter as listed (slice 032). */
export interface CommunicationMailItem {
  id: string
  subject: string
  sender: CommunicationMailParticipant
  recipient: CommunicationMailParticipant
  sent_at: number
  /** Recipient read state; always `true` in the sent box (no read receipts). */
  was_read: boolean
  in_reply_to: string | null
}
