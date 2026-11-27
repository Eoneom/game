import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import type {
  ChatChannel,
  CommunicationChatHistoryDataResponse,
  CommunicationChatMessage,
} from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

const CHAT_HISTORY_PAGE_SIZE = 50

const chatKeys = {
  history: (channel: ChatChannel) => ['chat', channel] as const,
}

type ChatHistory = InfiniteData<CommunicationChatHistoryDataResponse, string | undefined>

/** Adds a live or just-posted message on top of the cached history (pages are newest first). */
export const prependChatMessage = (
  queryClient: QueryClient,
  channel: ChatChannel,
  message: CommunicationChatMessage
): void => {
  queryClient.setQueryData<ChatHistory>(chatKeys.history(channel), (history) => {
    if (!history || history.pages.length === 0) return history
    const known = history.pages.some(page => page.messages.some(candidate => candidate.id === message.id))
    if (known) return history
    const [ first, ...rest ] = history.pages
    return {
      ...history,
      pages: [ { ...first, messages: [ message, ...first.messages ] }, ...rest ],
    }
  })
}

export const useChatHistory = (channel: ChatChannel, enabled: boolean) => {
  const { token } = useAuth()

  return useInfiniteQuery({
    queryKey: chatKeys.history(channel),
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.getChatHistory(token, {
        channel,
        before: pageParam,
        limit: CHAT_HISTORY_PAGE_SIZE,
      })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.has_more
      ? lastPage.messages[lastPage.messages.length - 1]?.id
      : undefined,
    enabled: !!token && enabled,
  })
}

export const usePostChatMessage = (channel: ChatChannel, { onSuccess }: { onSuccess?: () => void } = {}) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.postChatMessage(token, { channel, body })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    onSuccess: (message) => {
      prependChatMessage(queryClient, channel, message)
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}
