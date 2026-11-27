import { FactionCode } from '@server-core/faction/constant/code'

export interface CommunicationChatMessage {
  id: string
  author: {
    id: string
    name: string
    faction_code: FactionCode
  }
  body: string
  created_at: number
}
