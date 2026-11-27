import React, { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { Layer, Shape } from 'react-konva'
import { Coordinates } from '@eoneom/api-client'

import { HOVER_COLOR, SELECTION_COLOR } from '#map/helper'
import { MapWindow } from '#map/viewport'

const PULSE_MS = 700

interface Props {
  view: MapWindow
  hovered: Coordinates | null
  selected: Coordinates | null
  /** Changes after a jump (« Aller à », « Mes emplacements », URL focus): the selection outline pulses once. */
  pulseToken: number
}

/** UI layer (slice 044): hover and selection outlines. */
export const SelectionLayer: React.FC<Props> = ({ view, hovered, selected, pulseToken }) => {
  const layerRef = useRef<Konva.Layer>(null)
  const pulseStart = useRef<number | null>(null)

  useEffect(() => {
    if (pulseToken === 0) return
    pulseStart.current = performance.now()
    let frame = 0
    const step = () => {
      layerRef.current?.batchDraw()
      if (pulseStart.current !== null && performance.now() - pulseStart.current < PULSE_MS) {
        frame = requestAnimationFrame(step)
      } else {
        pulseStart.current = null
        layerRef.current?.batchDraw()
      }
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [ pulseToken ])

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(context: Konva.Context) => {
          const ctx = context._context
          const { cellSize: cell, left, top } = view
          const rectOf = ({ x, y }: Coordinates) => [ (x - 0.5 - left) * cell, (top - y - 0.5) * cell ] as const
          if (hovered && !(selected && hovered.x === selected.x && hovered.y === selected.y)) {
            const [ x, y ] = rectOf(hovered)
            ctx.strokeStyle = HOVER_COLOR
            ctx.lineWidth = 2
            ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2)
          }
          if (selected) {
            const [ x, y ] = rectOf(selected)
            const elapsed = pulseStart.current === null ? null : performance.now() - pulseStart.current
            const grow = elapsed === null ? 0 : Math.sin(Math.min(1, elapsed / PULSE_MS) * Math.PI) * cell * 0.35
            ctx.strokeStyle = SELECTION_COLOR
            ctx.lineWidth = 3
            ctx.strokeRect(x + 1.5 - grow, y + 1.5 - grow, cell - 3 + grow * 2, cell - 3 + grow * 2)
          }
        }}
      />
    </Layer>
  )
}
