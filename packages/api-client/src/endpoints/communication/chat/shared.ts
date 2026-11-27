import { FactionCode } from '@server-core/faction/constant/code'

export interface CommunicationChatMessage {
  id: string
  author: {
    id: string
    name: string
    faction_code: FactionCode
    /** Shown as `[TAG] Name` (slice 033). */
    alliance_tag: string | null
  }
  body: string
  created_at: number
}
