import React, { useMemo } from 'react'
import type Konva from 'konva'
import { Layer, Shape } from 'react-konva'

import { useNow } from '#hook/now'
import { DANGER_COLOR, INCOMING_STYLE, LABEL_FONT, MOVEMENT_STYLES } from '#map/helper'
import { MapArrow, MapIncomingRing, arrowOffsets, arrowSegments, formatCountdown } from '#map/movements'
import { MapWindow, isInBounds, worldToStage } from '#map/viewport'

const HEAD_PX = 10

interface Props {
  view: MapWindow
  stage: { width: number; height: number }
  arrows: MapArrow[]
  rings: MapIncomingRing[]
  /** ETA labels on every arrow at zoom levels 1–4; at 5–6 only on the hovered or selected one. */
  showAllEta: boolean
  hoveredId: string | null
  selectedId: string | null
}

/**
 * Movements in one shape (slice 044): straight arrows origin → destination with a dot at the current position and
 * the ETA, incoming attacks at Détection 1 as a pulsing ring on the target. The only part of the map redrawn every
 * second (its own ticker).
 */
export const MovementsLayer: React.FC<Props> = ({ view, stage, arrows, rings, showAllEta, hoveredId, selectedId }) => {
  const now = useNow(1000)
  const offsets = useMemo(() => arrowOffsets(arrows), [ arrows ])
  const segments = arrowSegments({ arrows, offsets, view, stage, now })
  const pulse = Math.floor(now / 1000) % 2 === 0

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(context: Konva.Context) => {
          const ctx = context._context
          ctx.lineCap = 'round'
          for (const { arrow, from, to, dot } of segments) {
            const style = arrow.style === 'incoming' ? INCOMING_STYLE : MOVEMENT_STYLES[arrow.style]
            const emphasized = arrow.id === hoveredId || arrow.id === selectedId
            ctx.setLineDash(style.dash)
            ctx.strokeStyle = style.color
            ctx.lineWidth = style.width + (emphasized ? 1.5 : 0)
            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
            ctx.setLineDash([])

            const angle = Math.atan2(to.y - from.y, to.x - from.x)
            const head = arrow.style === 'incoming' && pulse ? HEAD_PX * 1.4 : HEAD_PX
            ctx.beginPath()
            ctx.moveTo(to.x, to.y)
            ctx.lineTo(to.x - head * Math.cos(angle - 0.45), to.y - head * Math.sin(angle - 0.45))
            ctx.lineTo(to.x - head * Math.cos(angle + 0.45), to.y - head * Math.sin(angle + 0.45))
            ctx.closePath()
            ctx.fillStyle = style.color
            ctx.fill()

            ctx.beginPath()
            ctx.arc(dot.x, dot.y, emphasized ? 6 : 5, 0, Math.PI * 2)
            ctx.fillStyle = style.color
            ctx.fill()
            ctx.strokeStyle = '#1d1712'
            ctx.lineWidth = 1.5
            ctx.stroke()

            if (showAllEta || emphasized) {
              const label = arrow.inBattle ? 'Bataille' : formatCountdown((arrow.arrive_at - now) / 1000)
              ctx.font = LABEL_FONT
              ctx.textAlign = 'left'
              ctx.textBaseline = 'middle'
              ctx.lineWidth = 3
              ctx.strokeStyle = 'rgba(20, 16, 12, 0.85)'
              ctx.strokeText(label, dot.x + 9, dot.y)
              ctx.fillStyle = '#f5ead0'
              ctx.fillText(label, dot.x + 9, dot.y)
            }
          }

          for (const ring of rings) {
            if (!isInBounds(ring.destination, view.range)) continue
            const { px, py } = worldToStage(ring.destination, view)
            const radius = Math.max(10, view.cellSize * (pulse ? 0.55 : 0.45))
            ctx.beginPath()
            ctx.arc(px, py, radius, 0, Math.PI * 2)
            ctx.strokeStyle = DANGER_COLOR
            ctx.lineWidth = 3
            ctx.stroke()
            const label = formatCountdown((ring.arrive_at - now) / 1000)
            ctx.font = LABEL_FONT
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.lineWidth = 3
            ctx.strokeStyle = 'rgba(20, 16, 12, 0.85)'
            ctx.strokeText(label, px, py + radius + 2)
            ctx.fillStyle = DANGER_COLOR
            ctx.fillText(label, px, py + radius + 2)
          }
        }}
      />
    </Layer>
  )
}
