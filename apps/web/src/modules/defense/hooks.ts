import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { DefenseCode } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'
import { cityKeys } from '#city/hooks'
import { triggerFxBurst } from '#ui/fx'

export const defenseKeys = {
  all: ['defenses'] as const,
  list: (cityId: string) => ['defenses', cityId] as const,
}

/** `GET /city/:city_id/defense`: Enceinte level, capacity, defenses, active batch and queue. */
export const useCityDefenses = (cityId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: defenseKeys.list(cityId),
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.defense.list(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!cityId,
  })
}

export const useBuildDefense = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, count }: { code: DefenseCode, count: number }) => {
      if (!token) throw new Error('no token')
      const res = await client.defense.build(token, { city_id: cityId, defense_code: code, count })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defenseKeys.list(cityId) })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId) })
      triggerFxBurst()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCancelDefenseBuild = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.defense.cancel(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defenseKeys.list(cityId) })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId) })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCancelQueuedDefenseBuild = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueItemId: string) => {
      if (!token) throw new Error('no token')
      const res = await client.defense.cancelQueued(token, {
        city_id: cityId,
        queue_item_id: queueItemId
      })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defenseKeys.list(cityId) })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}
