import { useQuery } from '@tanstack/react-query'
import { Coordinates } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { DestinationStance, destinationStance } from '#movement/spy'

/** Settlement stance of one destination cell, read from the world map (slice 030 spy action). */
export const useDestinationStance = (destination: Coordinates, enabled: boolean) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: [ 'world', 'destination-stance', destination.x, destination.y ] as const,
    queryFn: async (): Promise<DestinationStance> => {
      if (!token) throw new Error('no token')
      const res = await client.world.getCells(token, {
        min_x: destination.x,
        max_x: destination.x,
        min_y: destination.y,
        max_y: destination.y,
        detail: 'terrain',
      })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return destinationStance({
        coordinates: destination,
        viewer_faction_code: res.data.viewer.faction_code,
        settlements: res.data.settlements,
      })
    },
    enabled: !!token && enabled,
    retry: false,
  })
}
