import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { BuildingCode } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { cityKeys } from '#city/hooks'
import { activityKeys } from '#location/activity-hooks'
import { triggerFxBurst } from '#ui/fx'

export const buildingKeys = {
  list: (cityId: string) => ['buildings', cityId] as const,
  detail: (cityId: string, code: BuildingCode) => ['building', cityId, code] as const,
}

export const useListBuildings = (cityId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: buildingKeys.list(cityId ?? ''),
    queryFn: async () => {
      if (!token || !cityId) {
        return {
          buildings: [],
          upgrade_queue: []
        }
      }
      const res = await client.building.list(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('empty response')
      return res.data
    },
    enabled: !!token && !!cityId,
  })
}

export const useGetBuilding = (
  cityId: string,
  code: BuildingCode | null | undefined
) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: buildingKeys.detail(cityId, code ?? ('' as BuildingCode)),
    queryFn: async () => {
      if (!token || !cityId || !code) throw new Error('no token or city id')
      const res = await client.building.get(token, { city_id: cityId, building_code: code })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!cityId && !!code,
  })
}

export const useUpgradeBuilding = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: BuildingCode) => {
      if (!token) throw new Error('no token')
      const res = await client.building.upgrade(token, { city_id: cityId, building_code: code })
      if (isError(res)) throw new Error(res.error_code)
      return code
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: buildingKeys.list(cityId) })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(cityId, code) })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      triggerFxBurst()
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useCancelBuildingUpgrade = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.building.cancel(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildingKeys.list(cityId) })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId) })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useCancelQueuedBuildingUpgrade = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueItemId: string) => {
      if (!token) throw new Error('no token')
      const res = await client.building.cancelQueued(token, {
        city_id: cityId,
        queue_item_id: queueItemId
      })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildingKeys.list(cityId) })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
