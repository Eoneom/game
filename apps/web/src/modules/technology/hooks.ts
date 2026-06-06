import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { TechnologyCode } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { cityKeys } from '#city/hooks'
import { activityKeys } from '#location/activity-hooks'
import { triggerFxBurst } from '#ui/fx'

export const technologyKeys = {
  all: ['technologies'] as const,
  detail: (cityId: string, code: TechnologyCode) => ['technology', cityId, code] as const,
}

export const useListTechnologies = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: technologyKeys.all,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.technology.list(token)
      if (isError(res)) throw new Error(res.error_code)
      return res.data?.technologies ?? []
    },
    enabled: !!token,
  })
}

export const useGetTechnology = (
  cityId: string,
  code: TechnologyCode | null | undefined
) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: technologyKeys.detail(cityId, code ?? ('' as TechnologyCode)),
    queryFn: async () => {
      if (!token || !code) throw new Error('no token or code')
      const res = await client.technology.get(token, { city_id: cityId, technology_code: code })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!cityId && !!code,
  })
}

export const useResearchTechnology = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: TechnologyCode) => {
      if (!token) throw new Error('no token')
      const res = await client.technology.research(token, { city_id: cityId, technology_code: code })
      if (isError(res)) throw new Error(res.error_code)
      return code
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: technologyKeys.all })
      queryClient.invalidateQueries({ queryKey: technologyKeys.detail(cityId, code) })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      triggerFxBurst()
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useCancelTechnology = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.technology.cancel(token)
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: technologyKeys.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
