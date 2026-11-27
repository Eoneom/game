import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CommunicationMailBox, CommunicationSendMailRequest } from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

export const mailKeys = {
  all: ['mails'] as const,
  list: (box: CommunicationMailBox, page: number) => ['mails', 'list', box, page] as const,
  unreadCount: ['mails', 'unread-count'] as const,
  detail: (mailId: string) => ['mails', 'detail', mailId] as const,
  playerSearch: (q: string) => ['player-search', q] as const,
}

export const useListMail = (box: CommunicationMailBox, page: number) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: mailKeys.list(box, page),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.listMail(token, { box, page })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token,
  })
}

/** Opening a letter marks it read on the server for its recipient. */
export const useGetMail = (mailId: string | null | undefined) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: mailKeys.detail(mailId ?? ''),
    queryFn: async () => {
      if (!token || !mailId) throw new Error('empty token')
      const res = await client.communication.getMail(token, { mail_id: mailId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      queryClient.invalidateQueries({ queryKey: ['mails', 'list'] })
      queryClient.invalidateQueries({ queryKey: mailKeys.unreadCount })
      return res.data
    },
    enabled: !!token && !!mailId,
  })
}

export const useCountUnreadMail = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: mailKeys.unreadCount,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.countUnreadMail(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data.count
    },
    enabled: !!token,
  })
}

export const useSendMail = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CommunicationSendMailRequest) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.sendMail(token, body)
      if (isError(res)) throw new Error(res.error_code)
      return res.data
    },
    onSuccess: () => {
      toast.success('Lettre envoyée')
      queryClient.invalidateQueries({ queryKey: mailKeys.all })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useMarkMailUnread = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mailId: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.markMail(token, { mail_id: mailId, was_read: false })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails', 'list'] })
      queryClient.invalidateQueries({ queryKey: mailKeys.unreadCount })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useDeleteMail = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mailId: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.deleteMail(token, { mail_id: mailId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      toast.success('Lettre supprimée')
      queryClient.invalidateQueries({ queryKey: ['mails', 'list'] })
      queryClient.invalidateQueries({ queryKey: mailKeys.unreadCount })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const usePlayerSearch = (q: string) => {
  const { token } = useAuth()
  const trimmed = q.trim()

  return useQuery({
    queryKey: mailKeys.playerSearch(trimmed),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.player.search(token, { q: trimmed })
      if (isError(res)) throw new Error(res.error_code)
      return res.data?.players ?? []
    },
    enabled: !!token && trimmed.length >= 2,
    staleTime: 30_000,
  })
}
