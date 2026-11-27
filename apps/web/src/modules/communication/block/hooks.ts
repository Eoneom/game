import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

const blockKeys = {
  list: ['blocked-players'] as const,
}

const invalidateBlockedContent = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: blockKeys.list })
  // Blocked authors are filtered out of chat history by the server.
  queryClient.invalidateQueries({ queryKey: ['chat'] })
}

export const useListBlockedPlayers = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: blockKeys.list,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.listBlockedPlayers(token)
      if (isError(res)) throw new Error(res.error_code)
      return res.data?.players ?? []
    },
    enabled: !!token,
  })
}

export const useBlockPlayer = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playerName: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.blockPlayer(token, { player_name: playerName })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: (_data, playerName) => {
      toast.success(`${playerName} est bloqué`)
      invalidateBlockedContent(queryClient)
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useUnblockPlayer = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playerId: string) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.unblockPlayer(token, { player_id: playerId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => invalidateBlockedContent(queryClient),
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}
