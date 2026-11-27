import { useCallback, useMemo, useState } from 'react'

import {
  DEFAULT_ZOOM_LEVEL,
  MapPoint,
  MapZoomLevel,
  StageSize,
  centerAfterZoom,
  clampCenter,
  clampZoomLevel,
  mapWindow,
  stageToWorld,
} from '#map/viewport'

/**
 * View state of the map (slice 044): fractional centre, zoom level and stage size. Terrain, exploration and
 * markers come from `#map/hooks`; this hook no longer pages cells.
 */
export const useMapView = ({ center: initialCenter, zoom: initialZoom }: { center: MapPoint; zoom?: MapZoomLevel }) => {
  const [ center, setCenter ] = useState<MapPoint>(initialCenter)
  const [ zoom, setZoom ] = useState<MapZoomLevel>(initialZoom ?? DEFAULT_ZOOM_LEVEL)
  const [ stage, setStage ] = useState<StageSize>({ width: 0, height: 0 })

  const view = useMemo(() => mapWindow({ center, zoom, stage }), [ center, zoom, stage ])

  const panTo = useCallback((next: MapPoint) => setCenter(clampCenter(next, zoom, stage)), [ zoom, stage ])

  const zoomTo = useCallback((level: number, anchor?: { px: number; py: number }) => {
    const next = clampZoomLevel(level)
    if (next === zoom) return
    if (anchor) {
      const world = stageToWorld(anchor.px, anchor.py, view)
      setCenter(centerAfterZoom({ anchor: world, center: view.center, fromZoom: zoom, toZoom: next, stage }))
    } else {
      setCenter(clampCenter(view.center, next, stage))
    }
    setZoom(next)
  }, [ zoom, view, stage ])

  /** Jump: centre on a cell, optionally at another zoom level. */
  const jumpTo = useCallback((target: MapPoint, level?: MapZoomLevel) => {
    const nextZoom = level ?? zoom
    setZoom(nextZoom)
    setCenter(clampCenter(target, nextZoom, stage))
  }, [ zoom, stage ])

  const resize = useCallback((size: StageSize) => {
    setStage(size)
    setCenter(previous => clampCenter(previous, zoom, size))
  }, [ zoom ])

  return { view, stage, zoom, panTo, zoomTo, jumpTo, resize }
}
