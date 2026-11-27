import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FactionCode, OutpostType, WORLD_SIZE, WorldMarkerCity, WorldTarget } from '@eoneom/api-client'

import { MarkersLayer } from '#map/layers/markers'
import { MovementsLayer } from '#map/layers/movements'
import { OverlayLayer } from '#map/layers/overlay'
import { SelectionLayer } from '#map/layers/selection'
import { TerrainLayer } from '#map/layers/terrain'
import { screenMarkers } from '#map/markers'
import { mapWindow } from '#map/viewport'

const konva = vi.hoisted(() => ({ shapes: [] as { sceneFunc: (context: unknown) => void }[] }))

vi.mock('react-konva', () => ({
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Shape: (props: { sceneFunc: (context: unknown) => void }) => {
    konva.shapes.push(props)
    return <div data-testid="shape" />
  },
}))

/** Canvas 2D stand-in that counts every method call. */
const recordingContext = () => {
  const calls: Record<string, number> = {}
  const state: Record<string | symbol, unknown> = {}
  const raw = new Proxy(state, {
    get: (target, property) => {
      if (property === 'measureText') return () => ({ width: 24 })
      if (property in target) return target[property]
      return () => {
        calls[String(property)] = (calls[String(property)] ?? 0) + 1
      }
    },
    set: (target, property, value) => {
      target[property] = value
      return true
    },
  })
  const draws = (names: string[]) => names.reduce((sum, name) => sum + (calls[name] ?? 0), 0)
  return { context: { _context: raw }, calls, draws }
}

const DRAW_CALLS = [ 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText' ]
const STAGE = { width: 1480, height: 860 }
const TERRAIN = 'frl'.repeat(Math.ceil(WORLD_SIZE * WORLD_SIZE / 3)).slice(0, WORLD_SIZE * WORLD_SIZE)

const city = (index: number): WorldMarkerCity => ({
  id: `c${index}`,
  name: `Ville ${index}`,
  player_id: 'p',
  owner_name: 'Owner',
  faction_code: FactionCode.THE_ASH_LITURGY,
  alliance_tag: null,
  relation: index % 2 ? 'enemy' : 'system',
  size: 1,
  coordinates: { x: 15 + (index % 70), y: 30 + Math.floor(index / 70) },
})

afterEach(() => {
  cleanup()
  konva.shapes.length = 0
})

describe('map layers (slice 044)', () => {
  it('draws level 6 with 300 markers in five shapes and a bounded number of draw calls', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 6, stage: STAGE })
    const markers = screenMarkers({ cities: Array.from({ length: 300 }, (_, index) => city(index)), outposts: [], view, current: null })
    expect(markers).toHaveLength(300)

    const { getAllByTestId } = render(
      <>
        <TerrainLayer view={view} terrain={TERRAIN} />
        <OverlayLayer view={view} metric={null} exploration={undefined} occupied={[]} showValues={false} targets={null} now={0} />
        <MarkersLayer markers={markers} showLabels={false} />
        <MovementsLayer view={view} stage={STAGE} arrows={[]} rings={[]} showAllEta={false} hoveredId={null} selectedId={null} />
        <SelectionLayer view={view} hovered={null} selected={null} pulseToken={0} />
      </>
    )
    expect(getAllByTestId('layer')).toHaveLength(5)
    expect(getAllByTestId('shape')).toHaveLength(5)

    const terrain = recordingContext()
    konva.shapes[0].sceneFunc(terrain.context)
    // Background, one fill per terrain type and one grid stroke for ~43 × 73 cells.
    expect(terrain.draws(DRAW_CALLS)).toBe(5)
    expect(terrain.calls.rect).toBeLessThanOrEqual((view.range.max_x - view.range.min_x + 1) * (view.range.max_y - view.range.min_y + 1))

    const markerContext = recordingContext()
    konva.shapes[2].sceneFunc(markerContext.context)
    expect(markerContext.draws(DRAW_CALLS)).toBeLessThanOrEqual(600)
  })

  it('colours explored cells only and hatches the others', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 1, stage: { width: 700, height: 700 } })
    const exploration = new Map([ [ '50:50', { plastic: 1.8, mushroom: 1, solar: 1 } ], [ '51:50', { plastic: 0.6, mushroom: 1, solar: 1 } ] ])
    render(<OverlayLayer view={view} metric="plastic" exploration={exploration} occupied={[ { x: 50, y: 50 } ]} showValues targets={null} now={0} />)

    const overlay = recordingContext()
    konva.shapes[0].sceneFunc(overlay.context)
    // Two explored cells → two coloured rects (+ one occupied outline), the other 79 of the 9 × 9 range are hatched.
    expect(overlay.calls.rect).toBe(3)
    expect(overlay.calls.fill).toBe(2)
    expect(overlay.calls.fillText).toBe(2)
    expect(overlay.calls.moveTo).toBe(79 * 3)
  })

  it('fogs targets without a spy report and badges the others with the report age', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 1, stage: { width: 700, height: 700 } })
    const target = (id: string, x: number, intel: WorldTarget['intel']): WorldTarget => ({
      kind: 'outpost',
      id,
      category: 'target',
      relation: 'system',
      name: null,
      outpost_type: OutpostType.PERMANENT,
      owner_name: 'Harrow',
      alliance_tag: 'SYS',
      faction_code: FactionCode.THE_ASH_LITURGY,
      size: null,
      coordinates: { x, y: 50 },
      nearest: { kind: 'city', id: 'home', coordinates: { x: 48, y: 50 }, distance: 2 },
      intel,
    })
    render(
      <OverlayLayer
        view={view}
        metric={null}
        exploration={undefined}
        occupied={[]}
        showValues={false}
        targets={[
          target('fog', 50, null),
          target('known', 52, { report_id: 'r', recorded_at: 0, tier: 2, troop_count: 3, defenses_known: true, estimated: { attack: 10, life: 20 } }),
        ]}
        now={2 * 3_600_000}
      />
    )
    const texts: string[] = []
    const overlay = recordingContext()
    ;(overlay.context._context as unknown as { fillText: (text: string) => void }).fillText = (text: string) => texts.push(text)
    konva.shapes[0].sceneFunc(overlay.context)
    expect(texts).toEqual([ '?', '2 h' ])
  })
})
