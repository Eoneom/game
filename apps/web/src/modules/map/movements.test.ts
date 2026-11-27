import { describe, expect, it } from 'vitest'
import { FactionCode, MovementAction, MovementKind, TroopIncomingMovement } from '@eoneom/api-client'

import { MovementItem } from '#types'
import { hitTest, movementProgress, offsetSegment, pointToSegmentDistance } from '#map/geometry'
import { arrowOffsets, arrowSegments, formatCountdown, toMapArrows } from '#map/movements'
import { mapWindow, worldToStage } from '#map/viewport'

const own = (overrides: Partial<MovementItem> = {}): MovementItem => ({
  id: 'm1',
  action: MovementAction.ATTACK,
  kind: MovementKind.OUTGOING,
  origin: { x: 10, y: 10 },
  destination: { x: 20, y: 10 },
  departure_at: 1_000,
  arrive_at: 11_000,
  battle_id: null,
  resources: { plastic: 0, mushroom: 0, plasma: 0, water: 0 },
  troops: [],
  ...overrides,
})

const incoming = (overrides: Partial<TroopIncomingMovement> = {}): TroopIncomingMovement => ({
  id: 'i1',
  target: { kind: 'city', id: 'c1', name: 'Core', coordinates: { x: 12, y: 12 } },
  arrive_at: 20_000,
  ...overrides,
})

describe('map hit tests (slice 044)', () => {
  it('measures the distance from a point to a segment', () => {
    expect(pointToSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
    expect(pointToSegmentDistance({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
    expect(pointToSegmentDistance({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(Math.SQRT2)
  })

  it('selects an arrow within 6 px, and a marker beats the empty cell and the arrow under it', () => {
    const segments = [ { id: 'a', from: { x: 0, y: 100 }, to: { x: 400, y: 100 }, dot: { x: 300, y: 100 } } ]
    const markers = [ { center: { x: 100, y: 100 }, radius: 12, key: 'city' } ]
    expect(hitTest({ point: { x: 200, y: 105 }, segments, markers })).toEqual({ kind: 'movement', id: 'a' })
    expect(hitTest({ point: { x: 200, y: 108 }, segments, markers })).toEqual({ kind: 'cell' })
    expect(hitTest({ point: { x: 104, y: 103 }, segments, markers })).toEqual({ kind: 'marker', marker: markers[0] })
    expect(hitTest({ point: { x: 302, y: 103 }, segments, markers })).toEqual({ kind: 'movement', id: 'a' })
    expect(hitTest({ point: { x: 600, y: 600 }, segments, markers })).toEqual({ kind: 'cell' })
  })

  it('offsets parallel movements sideways', () => {
    const [ from, to ] = offsetSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 4)
    expect(from).toEqual({ x: 0, y: 4 })
    expect(to).toEqual({ x: 10, y: 4 })
    const offsets = arrowOffsets(toMapArrows({
      own: [ own({ id: 'a' }), own({ id: 'b', origin: { x: 20, y: 10 }, destination: { x: 10, y: 10 } }), own({ id: 'c', destination: { x: 30, y: 30 } }) ],
      incoming: [],
    }).arrows)
    expect(offsets.get('a')).toBe(-2)
    expect(offsets.get('b')).toBe(-2)
    expect(offsets.get('c')).toBe(0)
  })
})

describe('movements on the map (slice 044)', () => {
  it('places the dot from departure_at and arrive_at', () => {
    expect(movementProgress({ now: 1_000, departure_at: 1_000, arrive_at: 11_000 })).toBe(0)
    expect(movementProgress({ now: 6_000, departure_at: 1_000, arrive_at: 11_000 })).toBe(0.5)
    expect(movementProgress({ now: 20_000, departure_at: 1_000, arrive_at: 11_000 })).toBe(1)
    expect(movementProgress({ now: 0, departure_at: 1_000, arrive_at: 11_000 })).toBe(0)

    const view = mapWindow({ center: { x: 15, y: 10 }, zoom: 3, stage: { width: 1480, height: 860 } })
    const { arrows } = toMapArrows({ own: [ own() ], incoming: [] })
    const [ segment ] = arrowSegments({ arrows, offsets: new Map(), view, stage: { width: 1480, height: 860 }, now: 6_000 })
    const middle = worldToStage({ x: 15, y: 10 }, view)
    expect(segment.dot.x).toBeCloseTo(middle.px)
    expect(segment.dot.y).toBeCloseTo(middle.py)
  })

  it('keeps an attack in battle on its destination and draws return trips in the base style', () => {
    const { arrows } = toMapArrows({
      own: [ own({ battle_id: 'b1' }), own({ id: 'r', action: MovementAction.TRANSPORT, kind: MovementKind.RETURN }) ],
      incoming: [],
    })
    expect(arrows[0].inBattle).toBe(true)
    expect(arrows[1].style).toBe(MovementAction.BASE)
  })

  it('shows an incoming attack as a ring at Détection 1 and as an arrow from its origin from Détection 2', () => {
    const level1 = toMapArrows({ own: [], incoming: [ incoming() ] })
    expect(level1.arrows).toEqual([])
    expect(level1.rings).toEqual([ { id: 'i1', destination: { x: 12, y: 12 }, arrive_at: 20_000 } ])

    const level2 = toMapArrows({
      own: [],
      incoming: [ incoming({ origin: { x: 30, y: 2 }, departure_at: 5_000, attacker: { name: 'Raider', faction_code: FactionCode.THE_ASH_LITURGY } }) ],
    })
    expect(level2.rings).toEqual([])
    expect(level2.arrows).toEqual([ expect.objectContaining({
      id: 'i1',
      source: 'incoming',
      style: 'incoming',
      origin: { x: 30, y: 2 },
      destination: { x: 12, y: 12 },
      departure_at: 5_000,
    }) ])
  })

  it('draws only the arrows crossing the window', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 1, stage: { width: 700, height: 700 } })
    const { arrows } = toMapArrows({
      own: [
        own({ id: 'crossing', origin: { x: 40, y: 50 }, destination: { x: 60, y: 50 } }),
        own({ id: 'away', origin: { x: 1, y: 1 }, destination: { x: 5, y: 5 } }),
      ],
      incoming: [],
    })
    expect(arrowSegments({ arrows, offsets: new Map(), view, stage: { width: 700, height: 700 }, now: 0 }).map(segment => segment.id)).toEqual([ 'crossing' ])
  })

  it('formats the ETA as a compact countdown', () => {
    expect(formatCountdown(724)).toBe('12:04')
    expect(formatCountdown(3729)).toBe('1:02:09')
    expect(formatCountdown(-5)).toBe('00:00')
  })
})
