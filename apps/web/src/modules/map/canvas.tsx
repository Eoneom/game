import { MapCells } from '#map/cells'
import {
  centerAfterZoom,
  gameCellAtStagePoint,
  mapViewScaleAndPosition,
  panCenterByPixels,
} from '#map/geometry'
import { MapLegendOverlay } from '#map/legend-overlay'
import { MapMarkers } from '#map/markers'
import {
  clampHalfExtent,
  INITIAL_VIEWPORT_HALF_EXTENT,
  MAP_MAX_HALF_EXTENT,
  MAP_MIN_HALF_EXTENT,
} from '#map/viewport'
import { WorldViewport } from '#types'
import { Coordinates } from '@eoneom/api-client'
import Konva from 'konva'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Stage } from 'react-konva'

export interface MapNavigationProps {
  center: Coordinates
  half_extent: number
  homeCenter?: Coordinates | null
  onPanEnd: (center: Coordinates) => void
  onNavigate: (params: { center: Coordinates; half_extent: number }) => void
  onRecenter?: () => void
}

export interface MapCanvasProps {
  viewport: WorldViewport
  navigation: MapNavigationProps
  onCellClicked: (params: { x: number; y: number }) => void
  selectedCoordinates?: { x: number; y: number } | null
  cityMarker?: Coordinates | null
  outpostMarker?: Coordinates | null
}

type HoverTooltip = {
  px: number
  py: number
  cx: number
  cy: number
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  viewport,
  navigation,
  onCellClicked,
  selectedCoordinates,
  cityMarker,
  outpostMarker,
}) => {
  const {
    center,
    half_extent,
    homeCenter,
    onPanEnd,
    onNavigate,
    onRecenter,
  } = navigation

  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapGroupRef = useRef<Konva.Group>(null)
  const [size, setSize] = useState({
    width: 800,
    height: 450,
  })
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { scale, position } = useMemo(
    () => mapViewScaleAndPosition(size.width, size.height, viewport.bounds),
    [
      size.height,
      size.width,
      viewport.bounds,
    ],
  )

  useEffect(() => {
    const group = mapGroupRef.current
    if (!group || isDragging) {
      return
    }
    group.position({
      x: position.x,
      y: position.y,
    })
    group.scale({
      x: scale,
      y: scale,
    })
  }, [
    isDragging,
    position.x,
    position.y,
    scale,
  ])

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }

    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      const { width, height } = entry.contentRect
      const nextW = Math.max(0, Math.floor(width))
      const nextH = Math.max(0, Math.floor(height))
      setSize(s => (s.width === nextW && s.height === nextH ? s : {
        width: nextW,
        height: nextH,
      }))
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomIn = e.deltaY < 0
      const nextHalf = clampHalfExtent(
        half_extent + (zoomIn ? -1 : 1),
      )
      if (nextHalf === half_extent) {
        return
      }

      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const anchor = gameCellAtStagePoint(
        px,
        py,
        viewport.bounds,
        scale,
        position,
      )
      const nextCenter = centerAfterZoom(
        anchor,
        center,
        half_extent,
        nextHalf,
      )
      onNavigate({
        center: nextCenter,
        half_extent: nextHalf,
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [
    center,
    half_extent,
    onNavigate,
    position,
    scale,
    viewport.bounds,
  ])

  const updateHoverTooltip = (
    evt: { clientX: number; clientY: number },
    cell: { coordinates: { x: number; y: number } },
  ) => {
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) {
      return
    }
    setHoverTooltip({
      px: evt.clientX - box.left + 12,
      py: evt.clientY - box.top + 12,
      cx: cell.coordinates.x,
      cy: cell.coordinates.y,
    })
  }

  const hoverForCells =
    hoverTooltip == null
      ? null
      : {
        cx: hoverTooltip.cx,
        cy: hoverTooltip.cy,
      }

  const handleZoomStep = (zoomIn: boolean) => {
    const nextHalf = clampHalfExtent(
      half_extent + (zoomIn ? -1 : 1),
    )
    if (nextHalf === half_extent) {
      return
    }
    onNavigate({
      center,
      half_extent: nextHalf,
    })
  }

  const canZoomIn = half_extent > MAP_MIN_HALF_EXTENT
  const canZoomOut = half_extent < MAP_MAX_HALF_EXTENT

  return (
    <div className="map-root">
      <div className="map-toolbar">
        <h2>Carte</h2>
        <p className="map-hint">
          Glisser pour déplacer, molette pour zoomer. Cliquez une case pour les détails.
        </p>
        <div className="map-toolbar-actions">
          <button
            type="button"
            className="map-zoom-btn"
            disabled={!canZoomIn}
            aria-label="Zoom avant"
            onClick={() => handleZoomStep(true)}
          >
            +
          </button>
          <button
            type="button"
            className="map-zoom-btn"
            disabled={!canZoomOut}
            aria-label="Zoom arrière"
            onClick={() => handleZoomStep(false)}
          >
            −
          </button>
          {homeCenter && onRecenter && (
            <button
              type="button"
              className="map-recenter-btn"
              onClick={onRecenter}
            >
              Recentrer
            </button>
          )}
        </div>
      </div>
      <div className="map-stage-wrap" ref={wrapRef}>
        {hoverTooltip && (
          <div
            className="map-cell-tooltip"
            style={{
              left: hoverTooltip.px,
              top: hoverTooltip.py,
            }}
          >
            ({hoverTooltip.cx}, {hoverTooltip.cy})
          </div>
        )}
        <div
          id="map"
          className={`map-stage-container${isDragging ? ' map-stage-container--grabbing' : ''}`}
          ref={containerRef}
        >
          <Stage
            width={size.width}
            height={size.height}
            onMouseLeave={() => setHoverTooltip(null)}
          >
            <Layer>
              <Group
                ref={mapGroupRef}
                x={position.x}
                y={position.y}
                scaleX={scale}
                scaleY={scale}
                draggable
                onDragStart={() => setIsDragging(true)}
                onDragEnd={e => {
                  setIsDragging(false)
                  const node = e.target
                  const dx = node.x() - position.x
                  const dy = node.y() - position.y
                  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                    node.position({
                      x: position.x,
                      y: position.y,
                    })
                    return
                  }
                  const nextCenter = panCenterByPixels(
                    center,
                    {
                      dx,
                      dy,
                    },
                    scale,
                  )
                  node.position({
                    x: position.x,
                    y: position.y,
                  })
                  onPanEnd(nextCenter)
                }}
              >
                <MapCells
                  viewport={viewport}
                  hoverTooltip={hoverForCells}
                  selectedCoordinates={selectedCoordinates}
                  onCellClicked={onCellClicked}
                  onHoverCell={updateHoverTooltip}
                />
                <MapMarkers
                  bounds={viewport.bounds}
                  cityMarker={cityMarker}
                  outpostMarker={outpostMarker}
                />
              </Group>
              <MapLegendOverlay stageHeight={size.height} />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
}
