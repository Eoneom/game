import { ChatChannel } from '@server-core/communication/chat/channel'
import { GenericResponse } from '../../../response'
import { CommunicationChatMessage } from './shared'

export interface CommunicationChatHistoryRequest {
  channel: ChatChannel
  /** Message id: only older messages are returned. */
  before?: string
  /** Default 50, max 100. */
  limit?: number
}

export interface CommunicationChatHistoryDataResponse {
  /** Newest first. */
  messages: CommunicationChatMessage[]
  has_more: boolean
  /** The caller, so the client can tell its own messages apart. */
  viewer_player_id: string
}

export type CommunicationChatHistoryResponse = GenericResponse<CommunicationChatHistoryDataResponse>
