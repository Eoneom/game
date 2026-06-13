import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

export const reportKeys = {
  list: (page: number, was_read?: boolean) => ['reports', page, was_read] as const,
  unreadCount: ['reports', 'unread-count'] as const,
  detail: (reportId: string) => ['report', reportId] as const,
}

export const useListReports = (page: number, was_read?: boolean) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: reportKeys.list(page, was_read),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.listReport(token, { page, was_read })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return {
        reports: res.data.reports,
        total: res.data.total,
        page_size: res.data.page_size,
        page,
      }
    },
    enabled: !!token,
  })
}

export const useGetReport = (reportId: string | null | undefined) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: reportKeys.detail(reportId ?? ''),
    queryFn: async () => {
      if (!token || !reportId) throw new Error('empty token')
      const res = await client.communication.getReport(token, { report_id: reportId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')

      if (!res.data.was_read) {
        const markRes = await client.communication.markReport(token, {
          report_id: reportId,
          was_read: true,
        })
        if (isError(markRes)) throw new Error(markRes.error_code)
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        return { ...res.data, was_read: true }
      }

      return res.data
    },
    enabled: !!token && !!reportId,
  })
}

export const useMarkReportAsRead = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.markReport(token, { report_id: reportId, was_read: true })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useMarkAllReportsAsRead = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.markAllReports(token)
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCountUnreadReports = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: reportKeys.unreadCount,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.countUnread(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data.count
    },
    enabled: !!token,
  })
}
