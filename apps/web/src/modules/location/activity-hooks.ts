import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { useLocation } from '#location/context'

export const activityKeys = {
  all: ['activity'] as const,
  city: (cityId: string) => ['activity', 'city', cityId] as const,
  outpost: (outpostId: string) => ['activity', 'outpost', outpostId] as const,
}

export const useLocationActivity = () => {
  const { token } = useAuth()
  const { cityId, outpostId } = useLocation()

  return useQuery({
    queryKey: cityId
      ? activityKeys.city(cityId)
      : activityKeys.outpost(outpostId ?? ''),
    queryFn: async () => {
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

/** Call from a mounted shell so finish WS events refresh the strip. */
export const useActivityWsBridge = () => {
  const invalidate = useInvalidateLocationActivity()
  useEffect(() => {
    const onFocus = () => invalidate()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [invalidate])
}
