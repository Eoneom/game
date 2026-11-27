import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Coordinates, Resource, TroopCode } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'

interface MovementEstimateInput {
  origin: Coordinates
  destination: Coordinates
  troops: { code: TroopCode; count: number }[]
  /** Transport cargo only. */
  resources?: Resource
}

const ESTIMATE_DEBOUNCE_MS = 300

const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [ debounced, setDebounced ] = useState(value)
  const key = JSON.stringify(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
    // The serialised key stands for the value: a new object with the same content does not restart the delay.
  }, [ key, delay ])

  return debounced
}

/**
 * `POST /troop/movement/estimate` keyed by origin, destination, troops and cargo, 300 ms after the last edit
 * (slice 045). `duration` is in seconds.
 */
export const useMovementEstimate = (input: MovementEstimateInput | null) => {
  const { token } = useAuth()
  const debounced = useDebouncedValue(input, ESTIMATE_DEBOUNCE_MS)

  return useQuery({
    queryKey: [ 'movement', 'estimate', debounced ] as const,
    queryFn: async () => {
      if (!token || !debounced) throw new Error('no token')
      const res = await client.troop.estimateMovement(token, {
        origin: debounced.origin,
        destination: debounced.destination,
        troop_codes: debounced.troops.map(troop => troop.code),
        troops: debounced.troops,
        resources: debounced.resources,
      })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!debounced && debounced.troops.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  })
}
