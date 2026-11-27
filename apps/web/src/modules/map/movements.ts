import { Coordinates, MovementAction, MovementKind, TroopIncomingMovement } from '@eoneom/api-client'

import { MovementItem } from '#types'
import { lerpPoint, movementProgress, offsetSegment, Point, segmentOffset, SegmentTarget } from '#map/geometry'
import { MapWindow, worldToStage } from '#map/viewport'

/** A movement drawn as an arrow (slice 044): own movements, and incoming attacks once Détection reveals the origin. */
export interface MapArrow {
  id: string
  source: 'own' | 'incoming'
  /** Style key: the action, `base` for return trips, `incoming` for attacks against the player. */
  style: MovementAction | 'incoming'
  origin: Coordinates
  destination: Coordinates
  departure_at: number
  arrive_at: number
  /** Arrived attack still in battle: the dot stays on the destination. */
  inBattle: boolean
}

/** Incoming attack at Détection 1: target ring and ETA only. */
export interface MapIncomingRing {
  id: string
  destination: Coordinates
  arrive_at: number
}

export const toMapArrows = ({
  own,
  incoming,
}: {
  own: MovementItem[]
  incoming: TroopIncomingMovement[]
}): { arrows: MapArrow[]; rings: MapIncomingRing[] } => {
  const arrows: MapArrow[] = own.map(movement => ({
    id: movement.id,
    source: 'own',
    style: movement.kind === MovementKind.RETURN ? MovementAction.BASE : movement.action,
    origin: movement.origin,
    destination: movement.destination,
    departure_at: movement.departure_at,
    arrive_at: movement.arrive_at,
    inBattle: movement.battle_id !== null,
  }))
  const rings: MapIncomingRing[] = []
  for (const attack of incoming) {
    if (attack.origin && attack.departure_at !== undefined) {
      arrows.push({
        id: attack.id,
        source: 'incoming',
        style: 'incoming',
        origin: attack.origin,
        destination: attack.target.coordinates,
        departure_at: attack.departure_at,
        arrive_at: attack.arrive_at,
        inBattle: false,
      })
    } else {
      rings.push({ id: attack.id, destination: attack.target.coordinates, arrive_at: attack.arrive_at })
    }
  }
  return { arrows, rings }
}

const segmentKey = ({ origin, destination }: MapArrow): string => {
  const a = `${origin.x}:${origin.y}`
  const b = `${destination.x}:${destination.y}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Perpendicular offset (px) of each arrow so movements on the same segment stay clickable. */
export const arrowOffsets = (arrows: MapArrow[]): Map<string, number> => {
  const groups = new Map<string, MapArrow[]>()
  for (const arrow of arrows) {
    const key = segmentKey(arrow)
    groups.set(key, [ ...(groups.get(key) ?? []), arrow ])
  }
  const offsets = new Map<string, number>()
  for (const group of groups.values()) {
    group.forEach((arrow, index) => {
      // Same side whatever the direction: offsets follow the sorted endpoints.
      const forward = `${arrow.origin.x}:${arrow.origin.y}` <= `${arrow.destination.x}:${arrow.destination.y}`
      const offset = segmentOffset(index, group.length)
      offsets.set(arrow.id, forward ? offset : -offset)
    })
  }
  return offsets
}

interface ArrowSegment extends SegmentTarget {
  arrow: MapArrow
  dot: Point
}

const toStage = (point: Point, view: MapWindow): Point => {
  const { px, py } = worldToStage(point, view)
  return { x: px, y: py }
}

/** Stage segments of the arrows crossing the window (off-screen ends are clipped by the stage). */
export const arrowSegments = ({
  arrows,
  offsets,
  view,
  stage,
  now,
}: {
  arrows: MapArrow[]
  offsets: Map<string, number>
  view: MapWindow
  stage: { width: number; height: number }
  now: number
}): ArrowSegment[] => {
  const segments: ArrowSegment[] = []
  for (const arrow of arrows) {
    const offset = offsets.get(arrow.id) ?? 0
    const [ from, to ] = offsetSegment(toStage(arrow.origin, view), toStage(arrow.destination, view), offset)
    if (Math.max(from.x, to.x) < 0 || Math.min(from.x, to.x) > stage.width) continue
    if (Math.max(from.y, to.y) < 0 || Math.min(from.y, to.y) > stage.height) continue
    const progress = arrow.inBattle
      ? 1
      : movementProgress({ now, departure_at: arrow.departure_at, arrive_at: arrow.arrive_at })
    segments.push({ id: arrow.id, arrow, from, to, dot: lerpPoint(from, to, progress) })
  }
  return segments
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Compact countdown for the map: « 12:04 », « 1:02:09 ». */
export const formatCountdown = (seconds: number): string => {
  const total = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`
}
