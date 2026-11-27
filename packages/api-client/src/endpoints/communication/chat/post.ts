import { ChatChannel } from '@server-core/communication/chat/channel'
import { GenericResponse } from '../../../response'
import { CommunicationChatMessage } from './shared'

export interface CommunicationPostChatMessageRequest {
  channel: ChatChannel
  body: string
}

export type CommunicationPostChatMessageResponse = GenericResponse<CommunicationChatMessage>
