import { AppEvent, type ChatMessageEventPayload } from '@eoneom/api-client'

import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { prependChatMessage } from '#communication/chat/hooks'

export function registerChatWsListeners(): void {
  wsClient.on<ChatMessageEventPayload>(AppEvent.ChatMessage, ({ channel, message }) => {
    prependChatMessage(queryClient, channel, message)
  })
}
