/** Hit tests of the map stage (slice 044): computed from the pointer, no per-shape listener. */

export type Point = { x: number; y: number }

/** Pointer within this distance (px) of an arrow or its dot selects the movement. */
const ARROW_HIT_PX = 6
/** Movements sharing a segment are offset by this many px each. */
const SEGMENT_OFFSET_PX = 4

export const pointToSegmentDistance = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

/** Share of the trip done at `now`, in [0, 1]: `(now − departure) / (arrive − departure)`. */
export const movementProgress = ({
  now,
  departure_at,
  arrive_at,
}: {
  now: number
  departure_at: number
  arrive_at: number
}): number => {
  if (arrive_at <= departure_at) return now >= arrive_at ? 1 : 0
  return Math.max(0, Math.min(1, (now - departure_at) / (arrive_at - departure_at)))
}

/** Perpendicular offset (px) of the `index`-th of `count` movements drawn on the same segment, centred on it. */
export const segmentOffset = (index: number, count: number): number => (index - (count - 1) / 2) * SEGMENT_OFFSET_PX

/** Shifts a segment sideways by `offset` px. */
export const offsetSegment = (a: Point, b: Point, offset: number): [Point, Point] => {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length === 0 || offset === 0) return [ a, b ]
  const nx = -(b.y - a.y) / length * offset
  const ny = (b.x - a.x) / length * offset
  return [ { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny } ]
}

export interface SegmentTarget {
  id: string
  from: Point
  to: Point
  dot: Point | null
}

/**
 * The target under the pointer, in priority order: a movement dot, then a marker (`markers`, radius in px), then an
 * arrow segment, else the cell. A marker beats the empty cell under it.
 */
export const hitTest = <M extends { center: Point; radius: number }>({
  point,
  segments,
  markers,
}: {
  point: Point
  segments: SegmentTarget[]
  markers: M[]
}): { kind: 'movement'; id: string } | { kind: 'marker'; marker: M } | { kind: 'cell' } => {
  const dot = segments.find(segment => segment.dot && Math.hypot(point.x - segment.dot.x, point.y - segment.dot.y) <= ARROW_HIT_PX + 2)
  if (dot) return { kind: 'movement', id: dot.id }
  const marker = markers.find(entry => Math.hypot(point.x - entry.center.x, point.y - entry.center.y) <= Math.max(entry.radius, ARROW_HIT_PX))
  if (marker) return { kind: 'marker', marker }
  let best: { id: string; distance: number } | null = null
  for (const segment of segments) {
    const distance = pointToSegmentDistance(point, segment.from, segment.to)
    if (distance <= ARROW_HIT_PX && (!best || distance < best.distance)) best = { id: segment.id, distance }
  }
  if (best) return { kind: 'movement', id: best.id }
  return { kind: 'cell' }
}
