import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Coordinates, WorldGetCellsDetail } from '@eoneom/api-client'

import { WorldViewport } from '#types'
import { getCells } from '#map/api/cells'
import { useAuth } from '#auth/context'
import {
  boundsNeedsFetch,
  cellsInBounds,
  createCellCache,
  mergeCells,
  mergeSettlements,
  settlementsInBounds,
} from '#map/cell-cache'
import {
  CITY_MAP_INITIAL_HALF_EXTENT,
  clampHalfExtent,
  expandBoundsBy,
  fetchBoundsAround,
  MAX_VIEWPORT_SIDE,
  PanDirection,
  viewportBoundsAround,
} from '#map/viewport'
import {
  NAVIGATION_DEBOUNCE_MS,
  fetchBoundsForNavigation,
  planNavigationFetch,
  planPanEndFetch,
} from '#map/world-fetch-scheduler'

export { NAVIGATION_DEBOUNCE_MS }

export type WorldNavigation = {
  center: Coordinates
  half_extent: number
}

const scheduleIdle = (callback: () => void): void => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback())
    return
  }
  window.setTimeout(callback, 1)
}

export const useWorld = () => {
  const [center, setCenter] = useState<Coordinates | null>(null)
  const [half_extent, setHalfExtent] = useState(CITY_MAP_INITIAL_HALF_EXTENT)
  const [viewer, setViewer] = useState<WorldViewport['viewer'] | null>(null)
  const [settlements, setSettlements] =
    useState<WorldViewport['settlements'] | null>(null)
  const cellCacheRef = useRef(createCellCache())
  const [cacheVersion, setCacheVersion] = useState(0)
  const { token } = useAuth()
  const fetchGeneration = useRef(0)
  const pendingDetailRef = useRef<WorldGetCellsDetail>('full')
  const skipDebounceRef = useRef(false)
  const panDirectionRef = useRef<PanDirection | null>(null)

  const visibleBounds = useMemo(() => {
    if (!center) {
      return null
    }
    return viewportBoundsAround(center, half_extent)
  }, [center, half_extent])

  const viewport = useMemo((): WorldViewport | null => {
    if (!center || !visibleBounds || !viewer || !settlements) {
      return null
    }
    return {
      bounds: visibleBounds,
      cells: cellsInBounds(cellCacheRef.current, visibleBounds),
      viewer,
      settlements: settlementsInBounds(settlements, visibleBounds),
    }
  }, [
    center,
    visibleBounds,
    viewer,
    settlements,
    cacheVersion,
  ])

  const applyFetchResult = useCallback(
    (
      fetched: NonNullable<Awaited<ReturnType<typeof getCells>>>,
      bounds: ReturnType<typeof fetchBoundsAround>,
    ) => {
      mergeCells(cellCacheRef.current, fetched.cells)
      setCacheVersion(v => v + 1)
      setViewer(fetched.viewer)
      setSettlements(previous =>
        mergeSettlements(previous, fetched.settlements),
      )
    },
    [],
  )

  const prefetchIdleRing = useCallback(
    (fetchedBounds: ReturnType<typeof fetchBoundsAround>) => {
      if (!token) return
      const ring = expandBoundsBy(fetchedBounds, 1)
      const sideX = ring.max_x - ring.min_x + 1
      const sideY = ring.max_y - ring.min_y + 1
      if (
        sideX > MAX_VIEWPORT_SIDE ||
        sideY > MAX_VIEWPORT_SIDE ||
        !boundsNeedsFetch(cellCacheRef.current, ring)
      ) {
        return
      }

      scheduleIdle(() => {
        void (async () => {
          const generation = ++fetchGeneration.current
          const fetched = await getCells({
            token,
            bounds: ring,
            detail: 'terrain',
          })
          if (!fetched || generation !== fetchGeneration.current) return
          mergeCells(cellCacheRef.current, fetched.cells)
          setCacheVersion(v => v + 1)
        })()
      })
    },
    [token],
  )

  const loadCells = useCallback(
    async ({
      center: nextCenter,
      half_extent: nextHalf,
      detail,
      panDirection = panDirectionRef.current,
    }: WorldNavigation & {
      detail: WorldGetCellsDetail
      panDirection?: PanDirection | null
    }) => {
      if (!token) return

      const half = clampHalfExtent(nextHalf)
      const bounds = fetchBoundsAround(nextCenter, half, panDirection)
      const generation = ++fetchGeneration.current
      const fetched = await getCells({
        token,
        bounds,
        detail,
      })
      if (!fetched || generation !== fetchGeneration.current) return

      applyFetchResult(fetched, bounds)
      if (detail === 'terrain') {
        prefetchIdleRing(bounds)
      }
    },
    [
      token,
      applyFetchResult,
      prefetchIdleRing,
    ],
  )

  const scheduleLoadForNavigation = useCallback(
    (nextCenter: Coordinates, nextHalf: number) => {
      if (!token) return

      const half = clampHalfExtent(nextHalf)
      const bounds = fetchBoundsForNavigation(
        nextCenter,
        half,
        panDirectionRef.current,
      )
      const plan = planNavigationFetch({
        cache: cellCacheRef.current,
        bounds,
        pendingDetail: pendingDetailRef.current,
      })

      if (plan.kind === 'immediate') {
        skipDebounceRef.current = true
        void loadCells({
          center: nextCenter,
          half_extent: half,
          detail: plan.detail,
        })
        return
      }

      const timer = window.setTimeout(() => {
        void loadCells({
          center: nextCenter,
          half_extent: half,
          detail: plan.detail,
        })
      }, NAVIGATION_DEBOUNCE_MS)

      return () => window.clearTimeout(timer)
    },
    [
      token,
      loadCells,
    ],
  )

  const fetch = useCallback(
    async (params: { center: Coordinates; half_extent?: number }) => {
      const half = clampHalfExtent(
        params.half_extent ?? half_extent,
      )
      skipDebounceRef.current = true
      pendingDetailRef.current = 'full'
      panDirectionRef.current = null
      setCenter(params.center)
      setHalfExtent(half)
      await loadCells({
        center: params.center,
        half_extent: half,
        detail: 'full',
      })
    },
    [
      half_extent,
      loadCells,
    ],
  )

  const navigate = useCallback((next: WorldNavigation) => {
    pendingDetailRef.current = 'terrain'
    setCenter(next.center)
    setHalfExtent(clampHalfExtent(next.half_extent))
  }, [])

  const panDuringDrag = useCallback(
    (nextCenter: Coordinates) => {
      pendingDetailRef.current = 'terrain'
      if (center) {
        panDirectionRef.current = {
          dx: nextCenter.x - center.x,
          dy: nextCenter.y - center.y,
        }
      }
      setCenter(nextCenter)

      if (!token) return
      const bounds = fetchBoundsAround(
        nextCenter,
        half_extent,
        panDirectionRef.current,
      )
      if (boundsNeedsFetch(cellCacheRef.current, bounds)) {
        skipDebounceRef.current = true
        void loadCells({
          center: nextCenter,
          half_extent,
          detail: 'terrain',
        })
      }
    },
    [
      center,
      half_extent,
      loadCells,
      token,
    ],
  )

  const panEnd = useCallback(
    (nextCenter: Coordinates) => {
      skipDebounceRef.current = true
      pendingDetailRef.current = 'terrain'
      panDirectionRef.current = null
      setCenter(nextCenter)

      if (!token) return
      const bounds = fetchBoundsForNavigation(nextCenter, half_extent, null)
      const pan_end = planPanEndFetch({
        cache: cellCacheRef.current,
        bounds,
      })
      if (pan_end.shouldFetch) {
        void loadCells({
          center: nextCenter,
          half_extent,
          detail: pan_end.detail,
        })
      }
    },
    [
      half_extent,
      loadCells,
      token,
    ],
  )

  const loadCellIntel = useCallback(
    async (coordinates: Coordinates) => {
      if (!token) return
      skipDebounceRef.current = true
      pendingDetailRef.current = 'full'
      panDirectionRef.current = null
      const bounds = viewportBoundsAround(coordinates, 0)
      const generation = ++fetchGeneration.current
      const fetched = await getCells({
        token,
        bounds,
        detail: 'full',
      })
      if (!fetched || generation !== fetchGeneration.current) return
      mergeCells(cellCacheRef.current, fetched.cells)
      setCacheVersion(v => v + 1)
      setViewer(fetched.viewer)
    },
    [token],
  )

  const setZoom = useCallback((nextHalf: number) => {
    pendingDetailRef.current = 'terrain'
    setHalfExtent(clampHalfExtent(nextHalf))
  }, [])

  useEffect(() => {
    if (!token || !center) return
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false
      return
    }

    const cleanup = scheduleLoadForNavigation(center, half_extent)
    return cleanup
  }, [
    center,
    half_extent,
    scheduleLoadForNavigation,
    token,
  ])

  return {
    viewport,
    center,
    half_extent,
    fetch,
    navigate,
    panDuringDrag,
    panEnd,
    loadCellIntel,
    setZoom,
  }
}
