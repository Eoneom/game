import { useQuery, useQueryClient } from '@tanstack/react-query'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { useLocation } from '#location/context'

export const activityKeys = {
  all: ['activity'] as const,
  city: (cityId: string) => ['activity', 'city', cityId] as const,
  outpost: (outpostId: string) => ['activity', 'outpost', outpostId] as const,
}

/**
 * Activity of the current location (slice 013, extended by 041) for the left column.
 * WebSocket listeners invalidate `activityKeys.all`; the 15 s polling stays as a safety net.
 */
export const useLocationActivity = () => {
  const { token } = useAuth()
  const { cityId, outpostId } = useLocation()

  return useQuery({
    queryKey: cityId
      ? activityKeys.city(cityId)
      : activityKeys.outpost(outpostId ?? ''),
    queryFn: async () => {
      if (!token) throw new Error('no token')
      if (cityId) {
        const res = await client.location.cityActivity(token, cityId)
        if (isError(res)) throw new Error(res.error_code)
        return res.data
      }
      if (outpostId) {
        const res = await client.location.outpostActivity(token, outpostId)
        if (isError(res)) throw new Error(res.error_code)
        return res.data
      }
      throw new Error('location:missing')
    },
    enabled: !!token && (!!cityId || !!outpostId),
    refetchInterval: 15_000,
  })
}

export const useInvalidateLocationActivity = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: activityKeys.all })
}
