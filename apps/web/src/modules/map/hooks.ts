import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Coordinates, GenericResponse, WORLD_SIZE } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { ExploredCell } from '#map/overlays'
import { boundsContain, paddedBounds, ViewportBounds } from '#map/viewport'

/** Map reads of slice 044. The terrain is static; the rest is invalidated by the WS listeners (`troop/ws-listener.ts`). */
export const mapKeys = {
  terrain: [ 'world', 'terrain' ] as const,
  exploration: [ 'world', 'exploration' ] as const,
  markers: [ 'world', 'markers' ] as const,
  markersIn: (bounds: ViewportBounds) => [ 'world', 'markers', bounds.min_x, bounds.max_x, bounds.min_y, bounds.max_y ] as const,
  targets: [ 'world', 'targets' ] as const,
  intel: (coordinates: Coordinates) => [ 'world', 'intel', coordinates.x, coordinates.y ] as const,
}

const WORLD_BOUNDS: ViewportBounds = { min_x: 1, max_x: WORLD_SIZE, min_y: 1, max_y: WORLD_SIZE }
const MARKERS_DEBOUNCE_MS = 150
const MINUTE_MS = 60_000

const unwrap = <T>(res: GenericResponse<T>): T => {
  if (isError(res)) throw new Error(res.error_code)
  if (!res.data) throw new Error('no data')
  return res.data
}

/** Whole-world terrain string, downloaded once per session. */
export const useWorldTerrain = () => {
  const { token } = useAuth()
  return useQuery({
    queryKey: mapKeys.terrain,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      return unwrap(await client.world.getTerrain(token))
    },
    enabled: !!token,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** The viewer's explored cells keyed `x:y`. */
export const useWorldExploration = () => {
  const { token } = useAuth()
  return useQuery({
    queryKey: mapKeys.exploration,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      return unwrap(await client.world.getExploration(token))
    },
    select: (data): Map<string, ExploredCell> => new Map(data.cells.map(([ x, y, plastic, mushroom, solar ]) => [
      cellKey({ x, y }),
      { plastic, mushroom, solar },
    ])),
    enabled: !!token,
  })
}

export const cellKey = ({ x, y }: Coordinates): string => `${x}:${y}`

const fetchMarkers = async (token: string, bounds: ViewportBounds) =>
  unwrap(await client.world.getMarkers(token, bounds))

/**
 * Markers around the drawn range (slice 044): bounds padded by 50 %, refetched 150 ms after the range leaves the
 * last fetched bounds. Each request has its own key, so a late answer for old bounds never replaces the current one.
 */
export const useWorldMarkers = (range: ViewportBounds | null) => {
  const { token } = useAuth()
  const [ bounds, setBounds ] = useState<ViewportBounds | null>(null)

  useEffect(() => {
    if (!range) return
    if (bounds && boundsContain(bounds, range)) return
    if (!bounds) {
      setBounds(paddedBounds(range))
      return
    }
    const timer = setTimeout(() => setBounds(paddedBounds(range)), MARKERS_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [ range?.min_x, range?.max_x, range?.min_y, range?.max_y, bounds ])

  return useQuery({
    queryKey: mapKeys.markersIn(bounds ?? WORLD_BOUNDS),
    queryFn: async () => {
      if (!token || !bounds) throw new Error('no token')
      return fetchMarkers(token, bounds)
    },
    enabled: !!token && !!bounds,
    placeholderData: keepPreviousData,
  })
}

/** Whole-world markers for the minimap dots, kept 60 s. */
export const useMinimapMarkers = () => {
  const { token } = useAuth()
  return useQuery({
    queryKey: mapKeys.markersIn(WORLD_BOUNDS),
    queryFn: async () => {
      if (!token) throw new Error('no token')
      return fetchMarkers(token, WORLD_BOUNDS)
    },
    enabled: !!token,
    staleTime: MINUTE_MS,
  })
}

/** « Cibles et menaces », fetched only while the overlay is on. */
export const useWorldTargets = (enabled: boolean) => {
  const { token } = useAuth()
  return useQuery({
    queryKey: mapKeys.targets,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      return unwrap(await client.world.getTargets(token))
    },
    enabled: !!token && enabled,
    staleTime: MINUTE_MS,
  })
}

/** Latest spy summary of one cell, for a selected settlement outside the targets list. */
export const useCellIntel = (coordinates: Coordinates | null) => {
  const { token } = useAuth()
  const key = useMemo(() => coordinates, [ coordinates?.x, coordinates?.y ])
  return useQuery({
    queryKey: mapKeys.intel(key ?? { x: 0, y: 0 }),
    queryFn: async () => {
      if (!token || !key) throw new Error('no token')
      return unwrap(await client.world.getIntel(token, key)).intel
    },
    enabled: !!token && !!key,
    staleTime: MINUTE_MS,
  })
}
