import React, { useEffect, useRef, useState } from 'react'
import { Coordinates, WORLD_SIZE } from '@eoneom/api-client'

import { DANGER_COLOR, MINIMAP_TERRAIN_COLORS, RELATION_STYLES, TerrainChar } from '#map/helper'
import { MapPoint, MapWindow } from '#map/viewport'

/** 2 px per cell. */
const CELL_PX = 2
const SIZE = WORLD_SIZE * CELL_PX

interface Props {
  view: MapWindow
  terrain: string | undefined
  /** Explored cells keyed `x:y`. */
  explored: { has: (key: string) => boolean } | undefined
  own: Coordinates[]
  allied: Coordinates[]
  /** Targets of incoming attacks (red ring). */
  threatened: Coordinates[]
  onRecenter: (center: MapPoint) => void
}

/**
 * Minimap of the whole world (slice 044): plain 2D canvas, dimmed terrain, fog on unexplored cells, own (amber) and
 * allied (green) locations, incoming attack targets (red ring). The visible window is an HTML rectangle on top;
 * clicking or dragging recentres the main map.
 */
export const MapMinimap: React.FC<Props> = ({ view, terrain, explored, own, allied, threatened, onRecenter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ hidden, setHidden ] = useState(false)
  const dragging = useRef(false)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#16110d'
    ctx.fillRect(0, 0, SIZE, SIZE)
    if (terrain) {
      for (const char of Object.keys(MINIMAP_TERRAIN_COLORS) as TerrainChar[]) {
        ctx.fillStyle = MINIMAP_TERRAIN_COLORS[char]
        for (let index = 0; index < terrain.length; index++) {
          if (terrain[index] !== char) continue
          const x = index % WORLD_SIZE
          const y = Math.floor(index / WORLD_SIZE) + 1
          ctx.fillRect(x * CELL_PX, (WORLD_SIZE - y) * CELL_PX, CELL_PX, CELL_PX)
        }
      }
    }
    if (explored) {
      ctx.fillStyle = 'rgba(10, 8, 6, 0.6)'
      for (let y = 1; y <= WORLD_SIZE; y++) {
        for (let x = 1; x <= WORLD_SIZE; x++) {
          if (!explored.has(`${x}:${y}`)) ctx.fillRect((x - 1) * CELL_PX, (WORLD_SIZE - y) * CELL_PX, CELL_PX, CELL_PX)
        }
      }
    }
    const dot = (coordinates: Coordinates, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect((coordinates.x - 1) * CELL_PX - 1, (WORLD_SIZE - coordinates.y) * CELL_PX - 1, CELL_PX + 2, CELL_PX + 2)
    }
    allied.forEach(coordinates => dot(coordinates, RELATION_STYLES.ally.fill))
    own.forEach(coordinates => dot(coordinates, RELATION_STYLES.mine.fill))
    ctx.strokeStyle = DANGER_COLOR
    ctx.lineWidth = 1.5
    for (const coordinates of threatened) {
      ctx.beginPath()
      ctx.arc((coordinates.x - 0.5) * CELL_PX, (WORLD_SIZE - coordinates.y + 0.5) * CELL_PX, 5, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [ terrain, explored, own, allied, threatened, hidden ])

  const recenterAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = Math.max(0, Math.min(SIZE, (event.clientX - rect.left) * SIZE / (rect.width || SIZE)))
    const py = Math.max(0, Math.min(SIZE, (event.clientY - rect.top) * SIZE / (rect.height || SIZE)))
    onRecenter({ x: px / CELL_PX + 0.5, y: WORLD_SIZE + 0.5 - py / CELL_PX })
  }

  if (hidden) {
    return (
      <button
        type="button"
        className="absolute bottom-2 left-2 z-10 surface-panel border-edge px-3 py-1.5 text-meta text-amber hover:text-ink"
        onClick={() => setHidden(false)}
      >
        Afficher la minicarte
      </button>
    )
  }

  // Visible window in minimap pixels (north at the top, as on the map).
  const rect = {
    left: (view.left - 0.5) * CELL_PX,
    top: (WORLD_SIZE + 0.5 - view.top) * CELL_PX,
    width: view.widthCells * CELL_PX,
    height: view.heightCells * CELL_PX,
  }

  return (
    <div className="absolute bottom-2 left-2 z-10 surface-panel border-edge p-1">
      <div
        className="relative cursor-crosshair"
        style={{ width: SIZE, height: SIZE, touchAction: 'none' }}
        aria-label="Minicarte : cliquez pour recentrer la carte"
        role="img"
        onPointerDown={event => {
          dragging.current = true
          event.currentTarget.setPointerCapture?.(event.pointerId)
          recenterAt(event)
        }}
        onPointerMove={event => {
          if (dragging.current) recenterAt(event)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
      >
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="block" />
        <div
          data-testid="minimap-viewport"
          className="pointer-events-none absolute border-2 border-amber"
          style={rect}
        />
      </div>
      <button
        type="button"
        className="mt-1 block w-full cursor-pointer text-center text-caption text-label hover:text-amber"
        onClick={() => setHidden(true)}
      >
        Masquer la minicarte
      </button>
    </div>
  )
}
