import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { Stage } from 'react-konva'

import { MapPoint, MapWindow, StageSize, panByPixels } from '#map/viewport'

/** Pointer travel (px) below which a press is a click, not a drag. */
const DRAG_THRESHOLD_PX = 4
/** One zoom level per wheel notch; bursts from trackpads are throttled. */
const WHEEL_THROTTLE_MS = 120

interface Props {
  view: MapWindow
  onResize: (size: StageSize) => void
  /** Drag: committed at most once per animation frame. */
  onPan: (center: MapPoint) => void
  onPanEnd: (center: MapPoint) => void
  /** `direction` +1 zooms in, −1 out, anchored on the pointer. */
  onWheelZoom: (direction: 1 | -1, point: { px: number; py: number }) => void
  onPointerClick: (point: { px: number; py: number }) => void
  onPointerHover: (point: { px: number; py: number } | null) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  children: React.ReactNode
}

/**
 * Konva stage of the map (slice 044). Layers do not listen: hover, click, drag and wheel are read on the container
 * and hit-tested in math by the page (`geometry.hitTest`), so no shape carries an event handler.
 */
export const MapCanvas: React.FC<Props> = ({
  view,
  onResize,
  onPan,
  onPanEnd,
  onWheelZoom,
  onPointerClick,
  onPointerHover,
  onKeyDown,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ size, setSize ] = useState<StageSize>({ width: 0, height: 0 })
  const [ dragging, setDragging ] = useState(false)
  const press = useRef<{ x: number; y: number; center: MapPoint; moved: boolean; pointerId: number } | null>(null)
  const frame = useRef<number | null>(null)
  const pending = useRef<MapPoint | null>(null)
  const lastWheel = useRef(0)
  const viewRef = useRef(view)
  viewRef.current = view
  const handlers = useRef({ onWheelZoom })
  handlers.current = { onWheelZoom }

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const next = { width: Math.max(0, Math.floor(rect.width)), height: Math.max(0, Math.floor(rect.height)) }
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onResize(size)
  }, [ size.width, size.height ])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const at = Date.now()
      if (at - lastWheel.current < WHEEL_THROTTLE_MS || event.deltaY === 0) return
      lastWheel.current = at
      const rect = element.getBoundingClientRect()
      handlers.current.onWheelZoom(event.deltaY < 0 ? 1 : -1, { px: event.clientX - rect.left, py: event.clientY - rect.top })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { px: event.clientX - rect.left, py: event.clientY - rect.top }
  }

  const schedulePan = (center: MapPoint) => {
    pending.current = center
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (pending.current) onPan(pending.current)
    })
  }

  return (
    <div
      ref={containerRef}
      id="map"
      tabIndex={0}
      role="application"
      aria-label="Carte du monde : flèches pour déplacer, + et − pour zoomer, Échap pour fermer"
      className={classNames('map-stage absolute inset-0 overflow-hidden focus-visible:-outline-offset-2', dragging ? 'cursor-grabbing' : 'cursor-pointer')}
      style={{ touchAction: 'none' }}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        if (event.button !== 0) return
        const { px, py } = localPoint(event)
        press.current = { x: px, y: py, center: viewRef.current.center, moved: false, pointerId: event.pointerId }
      }}
      onPointerMove={event => {
        const { px, py } = localPoint(event)
        const current = press.current
        if (!current) {
          onPointerHover({ px, py })
          return
        }
        const dx = px - current.x
        const dy = py - current.y
        if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
        if (!current.moved) {
          current.moved = true
          setDragging(true)
          onPointerHover(null)
          event.currentTarget.setPointerCapture?.(current.pointerId)
        }
        schedulePan(panByPixels(current.center, { dx, dy }, viewRef.current.cellSize))
      }}
      onPointerUp={event => {
        const current = press.current
        press.current = null
        if (!current) return
        const { px, py } = localPoint(event)
        if (!current.moved) {
          onPointerClick({ px, py })
          return
        }
        setDragging(false)
        if (frame.current !== null) {
          cancelAnimationFrame(frame.current)
          frame.current = null
        }
        onPanEnd(panByPixels(current.center, { dx: px - current.x, dy: py - current.y }, viewRef.current.cellSize))
      }}
      onPointerLeave={() => {
        if (!press.current) onPointerHover(null)
      }}
      onPointerCancel={() => {
        press.current = null
        setDragging(false)
      }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage width={size.width} height={size.height} listening={false}>
          {children}
        </Stage>
      )}
    </div>
  )
}
