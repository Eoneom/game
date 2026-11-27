import React from 'react'
import type Konva from 'konva'
import { Layer, Shape } from 'react-konva'
import { WORLD_SIZE } from '@eoneom/api-client'

import { GRID_COLOR, TERRAIN_COLORS, TerrainChar } from '#map/helper'
import { MapWindow } from '#map/viewport'

const TERRAIN_CHARS: TerrainChar[] = [ 'f', 'r', 'l' ]
/** Below this cell size the grid lines would only darken the map. */
const GRID_MIN_CELL_PX = 12

interface Props {
  view: MapWindow
  terrain: string | undefined
}

/**
 * Terrain of the drawn range (slice 044) in one shape: one path and one `fill` per terrain type, then one stroke
 * for the grid. The range has one cell of margin so panning never shows an empty edge.
 */
export const TerrainLayer: React.FC<Props> = ({ view, terrain }) => (
  <Layer listening={false}>
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context: Konva.Context) => {
        const ctx = context._context
        const { range, cellSize: cell, left, top } = view
        ctx.fillStyle = '#1d1712'
        ctx.fillRect(
          (0.5 - left) * cell,
          (top - WORLD_SIZE - 0.5) * cell,
          WORLD_SIZE * cell,
          WORLD_SIZE * cell
        )
        if (!terrain) return
        for (const char of TERRAIN_CHARS) {
          ctx.beginPath()
          for (let y = range.min_y; y <= range.max_y; y++) {
            const row = (y - 1) * WORLD_SIZE
            const py = (top - y - 0.5) * cell
            for (let x = range.min_x; x <= range.max_x; x++) {
              if (terrain[row + x - 1] === char) ctx.rect((x - 0.5 - left) * cell, py, cell, cell)
            }
          }
          ctx.fillStyle = TERRAIN_COLORS[char]
          ctx.fill()
        }
        if (cell < GRID_MIN_CELL_PX) return
        ctx.beginPath()
        for (let x = range.min_x; x <= range.max_x + 1; x++) {
          const px = (x - 0.5 - left) * cell
          ctx.moveTo(px, (top - range.max_y - 0.5) * cell)
          ctx.lineTo(px, (top - range.min_y + 0.5) * cell)
        }
        for (let y = range.min_y; y <= range.max_y + 1; y++) {
          const py = (top - y + 0.5) * cell
          ctx.moveTo((range.min_x - 0.5 - left) * cell, py)
          ctx.lineTo((range.max_x + 0.5 - left) * cell, py)
        }
        ctx.strokeStyle = GRID_COLOR
        ctx.lineWidth = 1
        ctx.stroke()
      }}
    />
  </Layer>
)
