import React from 'react'
import type Konva from 'konva'
import { Layer, Shape } from 'react-konva'
import { Coordinates, WorldTarget } from '@eoneom/api-client'

import { DANGER_COLOR, RELATION_STYLES, SMALL_FONT } from '#map/helper'
import { cellKey } from '#map/hooks'
import {
  ExploredCell,
  TERRAIN_OVERLAY_OPACITY,
  TERRAIN_RAMPS,
  formatCoefficient,
  formatReportAge,
  reportAgeClass,
  terrainBin,
  terrainValue,
} from '#map/overlays'
import { TerrainMetric } from '#map/search'
import { MapWindow, isInBounds, worldToStage } from '#map/viewport'

const FOG_COLOR = 'rgba(150, 140, 125, 0.85)'
const HATCH_COLOR = 'rgba(205, 185, 148, 0.35)'

interface Props {
  view: MapWindow
  /** « Bonus de terrain » metric, `null` when the overlay is off. */
  metric: TerrainMetric | null
  exploration: Map<string, ExploredCell> | undefined
  /** Cells holding a city or outpost, outlined so free spots stand out. */
  occupied: Coordinates[]
  /** Values are written in the cells from zoom level 1 to 3. */
  showValues: boolean
  /** « Cibles et menaces » entries, `null` when the overlay is off. */
  targets: WorldTarget[] | null
  now: number
}

/**
 * Overlays in one shape (slice 044): the terrain bonus heat map (explored cells only, unexplored hatched) and the
 * targets & threats rings with their spy report age badge, or fog when there is no report.
 */
export const OverlayLayer: React.FC<Props> = ({ view, metric, exploration, occupied, showValues, targets, now }) => (
  <Layer listening={false}>
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context: Konva.Context) => {
        const ctx = context._context
        const { range, cellSize: cell, left, top } = view
        const cellLeft = (x: number) => (x - 0.5 - left) * cell
        const cellTop = (y: number) => (top - y - 0.5) * cell

        if (metric && exploration) {
          const ramp = TERRAIN_RAMPS[metric]
          const bins: number[][] = ramp.map(() => [])
          const hatch: number[] = []
          for (let y = range.min_y; y <= range.max_y; y++) {
            for (let x = range.min_x; x <= range.max_x; x++) {
              const explored = exploration.get(cellKey({ x, y }))
              if (explored) bins[terrainBin(terrainValue(explored, metric))].push(x, y)
              else hatch.push(x, y)
            }
          }
          ctx.globalAlpha = TERRAIN_OVERLAY_OPACITY
          bins.forEach((cells, bin) => {
            if (cells.length === 0) return
            ctx.beginPath()
            for (let index = 0; index < cells.length; index += 2) ctx.rect(cellLeft(cells[index]), cellTop(cells[index + 1]), cell, cell)
            ctx.fillStyle = ramp[bin]
            ctx.fill()
          })
          ctx.globalAlpha = 1
          if (hatch.length > 0) {
            ctx.beginPath()
            for (let index = 0; index < hatch.length; index += 2) {
              const x0 = cellLeft(hatch[index])
              const y0 = cellTop(hatch[index + 1])
              ctx.moveTo(x0, y0 + cell / 2)
              ctx.lineTo(x0 + cell / 2, y0)
              ctx.moveTo(x0, y0 + cell)
              ctx.lineTo(x0 + cell, y0)
              ctx.moveTo(x0 + cell / 2, y0 + cell)
              ctx.lineTo(x0 + cell, y0 + cell / 2)
            }
            ctx.strokeStyle = HATCH_COLOR
            ctx.lineWidth = 1
            ctx.stroke()
          }
          const visibleOccupied = occupied.filter(coordinates => isInBounds(coordinates, range))
          if (visibleOccupied.length > 0) {
            ctx.beginPath()
            for (const { x, y } of visibleOccupied) ctx.rect(cellLeft(x) + 1.5, cellTop(y) + 1.5, cell - 3, cell - 3)
            ctx.strokeStyle = '#f5ead0'
            ctx.lineWidth = 2
            ctx.stroke()
          }
          if (showValues) {
            ctx.font = SMALL_FONT
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillStyle = '#fff6dc'
            for (let y = range.min_y; y <= range.max_y; y++) {
              for (let x = range.min_x; x <= range.max_x; x++) {
                const explored = exploration.get(cellKey({ x, y }))
                if (explored) ctx.fillText(formatCoefficient(terrainValue(explored, metric)), cellLeft(x) + cell / 2, cellTop(y) + cell - 3)
              }
            }
          }
        }

        if (targets) {
          for (const target of targets) {
            if (!isInBounds(target.coordinates, range)) continue
            const { px, py } = worldToStage(target.coordinates, view)
            const radius = Math.max(8, cell * 0.48)
            const color = target.category === 'threat' ? DANGER_COLOR : RELATION_STYLES[target.relation].fill
            ctx.setLineDash(target.category === 'threat' ? [ 4, 3 ] : [])
            ctx.beginPath()
            ctx.arc(px, py, radius, 0, Math.PI * 2)
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.setLineDash([])
            if (target.category === 'target') {
              // Crosshair ticks.
              ctx.beginPath()
              ctx.moveTo(px - radius - 4, py)
              ctx.lineTo(px - radius + 4, py)
              ctx.moveTo(px + radius - 4, py)
              ctx.lineTo(px + radius + 4, py)
              ctx.moveTo(px, py - radius - 4)
              ctx.lineTo(px, py - radius + 4)
              ctx.moveTo(px, py + radius - 4)
              ctx.lineTo(px, py + radius + 4)
              ctx.stroke()
            }
            ctx.font = SMALL_FONT
            ctx.textBaseline = 'middle'
            if (!target.intel) {
              ctx.beginPath()
              ctx.arc(px, py, radius * 0.8, 0, Math.PI * 2)
              ctx.fillStyle = 'rgba(60, 54, 48, 0.55)'
              ctx.fill()
              ctx.textAlign = 'center'
              ctx.fillStyle = FOG_COLOR
              ctx.fillText('?', px, py)
              continue
            }
            const age = reportAgeClass(target.intel.recorded_at, now)
            const label = formatReportAge(target.intel.recorded_at, now)
            const width = ctx.measureText(label).width + 8
            const bx = px + radius - 4
            const by = py - radius - 8
            ctx.globalAlpha = age === 'aging' ? 0.6 : 1
            if (age === 'stale') {
              ctx.strokeStyle = '#e8dcc0'
              ctx.lineWidth = 1
              ctx.strokeRect(bx, by, width, 16)
            } else {
              ctx.fillStyle = '#2c241e'
              ctx.fillRect(bx, by, width, 16)
            }
            ctx.textAlign = 'left'
            ctx.fillStyle = '#efe1bd'
            ctx.fillText(label, bx + 4, by + 8)
            ctx.globalAlpha = 1
          }
        }
      }}
    />
  </Layer>
)
