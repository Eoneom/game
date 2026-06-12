import { MapCells } from '#map/cells'
import { mapViewScaleAndPosition } from '#map/geometry'
import { MapLegendOverlay } from '#map/legend-overlay'
import { MapMarkers } from '#map/markers'
import { WorldViewport } from '#types'
import { Coordinates } from '@eoneom/api-client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Stage } from 'react-konva'

export interface MapCanvasProps {
  viewport: WorldViewport
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
  onCellClicked,
  selectedCoordinates,
  cityMarker,
  outpostMarker,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({
    width: 800,
    height: 450 
  })
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null)

  const { scale, position } = useMemo(
    () => mapViewScaleAndPosition(size.width, size.height, viewport.bounds),
    [
      size.height,
      size.width,
      viewport.bounds
    ],
  )

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
        height: nextH 
      }))
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
        cy: hoverTooltip.cy 
      }

  return (
    <div className="map-root">
      <div className="map-toolbar">
        <h2>Carte</h2>
        <p className="map-hint">Cliquez une case pour les détails.</p>
      </div>
      <div className="map-stage-wrap" ref={wrapRef}>
        {hoverTooltip && (
          <div
            className="map-cell-tooltip"
            style={{
              left: hoverTooltip.px,
              top: hoverTooltip.py 
            }}
          >
            ({hoverTooltip.cx}, {hoverTooltip.cy})
          </div>
        )}
        <div id="map" className="map-stage-container" ref={containerRef}>
          <Stage
            width={size.width}
            height={size.height}
            onMouseLeave={() => setHoverTooltip(null)}
          >
            <Layer>
              <Group
                x={position.x}
                y={position.y}
                scaleX={scale}
                scaleY={scale}
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
