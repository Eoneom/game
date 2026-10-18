import { useCallback, useEffect, useRef, useState } from 'react'
import { Coordinates } from '@eoneom/api-client'

import { WorldViewport } from '#types'
import { getCells } from '#map/api/cells'
import { useAuth } from '#auth/context'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  clampHalfExtent,
  viewportBoundsAround,
} from '#map/viewport'

const NAVIGATION_DEBOUNCE_MS = 200

export type WorldNavigation = {
  center: Coordinates
  half_extent: number
}

export const useWorld = () => {
  const [viewport, setViewport] = useState<WorldViewport | null>(null)
  const [center, setCenter] = useState<Coordinates | null>(null)
  const [half_extent, setHalfExtent] = useState(INITIAL_VIEWPORT_HALF_EXTENT)
  const { token } = useAuth()
  const fetchGeneration = useRef(0)
  const skipDebounceRef = useRef(false)

  const loadViewport = useCallback(
    async ({ center: nextCenter, half_extent: nextHalf }: WorldNavigation) => {
      if (!token) return

      const half = clampHalfExtent(nextHalf)
      const bounds = viewportBoundsAround(nextCenter, half)
      const generation = ++fetchGeneration.current
      const fetched = await getCells({
        token,
        bounds,
      })
      if (!fetched || generation !== fetchGeneration.current) return

      setViewport({
        bounds,
        cells: fetched.cells,
      })
      setCenter(nextCenter)
      setHalfExtent(half)
    },
    [token],
  )

  const fetch = useCallback(
    async (params: { center: Coordinates; half_extent?: number }) => {
      const half = clampHalfExtent(
        params.half_extent ?? half_extent,
      )
      skipDebounceRef.current = true
      setCenter(params.center)
      setHalfExtent(half)
      await loadViewport({
        center: params.center,
        half_extent: half,
      })
    },
    [
      half_extent,
      loadViewport,
    ],
  )

  const navigate = useCallback((next: WorldNavigation) => {
    setCenter(next.center)
    setHalfExtent(clampHalfExtent(next.half_extent))
  }, [])

  const panTo = useCallback((nextCenter: Coordinates) => {
    setCenter(nextCenter)
  }, [])

  const setZoom = useCallback((nextHalf: number) => {
    setHalfExtent(clampHalfExtent(nextHalf))
  }, [])

  useEffect(() => {
    if (!token || !center) return
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false
      return
    }

    const timer = window.setTimeout(() => {
      void loadViewport({
        center,
        half_extent,
      })
    }, NAVIGATION_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    center,
    half_extent,
    loadViewport,
    token,
  ])

  return {
    viewport,
    center,
    half_extent,
    fetch,
    navigate,
    panTo,
    setZoom,
  }
}
