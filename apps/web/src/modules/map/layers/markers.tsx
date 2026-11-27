import React from 'react'
import type Konva from 'konva'
import { Layer, Shape } from 'react-konva'

import { allianceDisplayName } from '#alliance/translations'
import { CURRENT_LOCATION_RING, LABEL_FONT, RELATION_STYLES } from '#map/helper'
import { ScreenMarker } from '#map/markers'

interface Props {
  markers: ScreenMarker[]
  /** City names on the stage from zoom level 1 to 3 (cells ≥ 40 px); otherwise on hover only. */
  showLabels: boolean
}

/**
 * Settlement markers in one shape (slice 044): cities as filled circles sized by their level bucket, permanent
 * outposts as diamonds, temporary ones as hollow diamonds, an amber ring on the current location.
 */
export const MarkersLayer: React.FC<Props> = ({ markers, showLabels }) => (
  <Layer listening={false}>
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context: Konva.Context) => {
        const ctx = context._context
        for (const marker of markers) {
          const style = RELATION_STYLES[marker.relation]
          const { x, y } = marker.center
          const r = marker.radius
          ctx.beginPath()
          if (marker.kind === 'city') {
            ctx.arc(x, y, r, 0, Math.PI * 2)
          } else {
            ctx.moveTo(x, y - r)
            ctx.lineTo(x + r, y)
            ctx.lineTo(x, y + r)
            ctx.lineTo(x - r, y)
            ctx.closePath()
          }
          if (marker.kind === 'outpost' && marker.hollow) {
            ctx.strokeStyle = style.fill
            ctx.lineWidth = 3
            ctx.stroke()
          } else {
            ctx.fillStyle = style.fill
            ctx.fill()
            ctx.strokeStyle = style.stroke
            ctx.lineWidth = 2
            ctx.stroke()
          }
          if (marker.current) {
            ctx.beginPath()
            ctx.arc(x, y, r + 5, 0, Math.PI * 2)
            ctx.strokeStyle = CURRENT_LOCATION_RING
            ctx.lineWidth = 2
            ctx.stroke()
          }
        }
        if (!showLabels) return
        ctx.font = LABEL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(20, 16, 12, 0.85)'
        for (const marker of markers) {
          if (marker.kind !== 'city') continue
          const label = allianceDisplayName(marker.marker.name, marker.marker.alliance_tag)
          const ly = marker.center.y + marker.radius + 3
          ctx.strokeText(label, marker.center.x, ly)
          ctx.fillStyle = '#f5ead0'
          ctx.fillText(label, marker.center.x, ly)
        }
      }}
    />
  </Layer>
)
