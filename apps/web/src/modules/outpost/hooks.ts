import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'

export const outpostKeys = {
  all: ['outposts'] as const,
  detail: (outpostId: string) => ['outpost', outpostId] as const,
}

export const useListOutposts = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: outpostKeys.all,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.outpost.list(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('data not found')
      return { outposts: res.data.outposts, count_limit: res.data.count_limit }
    },
    enabled: !!token,
  })
}

export const useGetOutpost = (outpostId: string | null | undefined) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: outpostKeys.detail(outpostId ?? ''),
    queryFn: async () => {
      if (!token || !outpostId) throw new Error('no token')
      const res = await client.outpost.get(token, { outpost_id: outpostId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('data not found')
      return res.data
    },
    enabled: !!token && !!outpostId,
  })
}

export const useSetOutpostPermanent = (outpostId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.outpost.setPermanent(token, { outpost_id: outpostId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outpostKeys.detail(outpostId) })
      queryClient.invalidateQueries({ queryKey: outpostKeys.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
