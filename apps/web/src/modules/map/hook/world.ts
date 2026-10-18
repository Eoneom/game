import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Coordinates, WorldGetCellsDetail } from '@eoneom/api-client'

import { WorldViewport } from '#types'
import { getCells } from '#map/api/cells'
import { useAuth } from '#auth/context'
import {
  cellsInBounds,
  createCellCache,
  mergeCells,
  mergeSettlements,
} from '#map/cell-cache'
import {
  CITY_MAP_INITIAL_HALF_EXTENT,
  clampHalfExtent,
  fetchBoundsAround,
  viewportBoundsAround,
} from '#map/viewport'

export const NAVIGATION_DEBOUNCE_MS = 150

export type WorldNavigation = {
  center: Coordinates
  half_extent: number
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
      settlements,
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
        mergeSettlements(previous, fetched.settlements, bounds),
      )
    },
    [],
  )

  const loadCells = useCallback(
    async ({
      center: nextCenter,
      half_extent: nextHalf,
      detail,
    }: WorldNavigation & { detail: WorldGetCellsDetail }) => {
      if (!token) return

      const half = clampHalfExtent(nextHalf)
      const bounds = fetchBoundsAround(nextCenter, half)
      const generation = ++fetchGeneration.current
      const fetched = await getCells({
        token,
        bounds,
        detail,
      })
      if (!fetched || generation !== fetchGeneration.current) return

      applyFetchResult(fetched, bounds)
    },
    [
      token,
      applyFetchResult,
    ],
  )

  const fetch = useCallback(
    async (params: { center: Coordinates; half_extent?: number }) => {
      const half = clampHalfExtent(
        params.half_extent ?? half_extent,
      )
      skipDebounceRef.current = true
      pendingDetailRef.current = 'full'
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

  const panDuringDrag = useCallback((nextCenter: Coordinates) => {
    pendingDetailRef.current = 'terrain'
    setCenter(nextCenter)
  }, [])

  const panEnd = useCallback(
    async (nextCenter: Coordinates) => {
      skipDebounceRef.current = true
      pendingDetailRef.current = 'full'
      setCenter(nextCenter)
      await loadCells({
        center: nextCenter,
        half_extent,
        detail: 'full',
      })
    },
    [
      half_extent,
      loadCells,
    ],
  )

  const refreshFullAtCenter = useCallback(async () => {
    if (!center) return
    skipDebounceRef.current = true
    pendingDetailRef.current = 'full'
    await loadCells({
      center,
      half_extent,
      detail: 'full',
    })
  }, [
    center,
    half_extent,
    loadCells,
  ])

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

    const detail = pendingDetailRef.current
    const timer = window.setTimeout(() => {
      void loadCells({
        center,
        half_extent,
        detail,
      })
    }, NAVIGATION_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    center,
    half_extent,
    loadCells,
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
    refreshFullAtCenter,
    setZoom,
  }
}
