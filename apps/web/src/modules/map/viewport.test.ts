import { describe, expect, it } from 'vitest'

import {
  MAP_ZOOM_ROWS,
  MapZoomLevel,
  boundsContain,
  cellAtStagePoint,
  centerAfterZoom,
  clampCenter,
  mapWindow,
  panByKey,
  panByPixels,
  paddedBounds,
  stageToWorld,
  worldToStage,
  zoomColumns,
} from '#map/viewport'

const STAGE = { width: 1480, height: 860 }
const LEVELS: MapZoomLevel[] = [ 1, 2, 3, 4, 5, 6 ]

describe('map viewport (slice 044)', () => {
  it('has six zoom levels from 7 to 41 rows', () => {
    expect(MAP_ZOOM_ROWS).toEqual([ 7, 11, 15, 21, 29, 41 ])
  })

  it('derives the columns from the stage aspect so cells stay square', () => {
    expect(LEVELS.map(level => zoomColumns(level, STAGE))).toEqual([ 13, 19, 26, 37, 50, 71 ])
    expect(zoomColumns(3, { width: 860, height: 860 })).toBe(15)
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 6, stage: STAGE })
    expect(view.rows).toBe(41)
    expect(view.cellSize).toBeCloseTo(860 / 41)
    expect(view.widthCells * view.cellSize).toBeCloseTo(1480)
  })

  it('clamps the window at the world edges', () => {
    const corner = mapWindow({ center: { x: 1, y: 1 }, zoom: 3, stage: STAGE })
    expect(corner.left).toBeCloseTo(0.5)
    expect(corner.top - corner.heightCells).toBeCloseTo(0.5)
    expect(corner.range).toMatchObject({ min_x: 1, min_y: 1 })

    const far = mapWindow({ center: { x: 100, y: 100 }, zoom: 6, stage: STAGE })
    expect(far.left + far.widthCells).toBeCloseTo(100.5)
    expect(far.top).toBeCloseTo(100.5)
    expect(far.range).toMatchObject({ max_x: 100, max_y: 100 })

    // A window wider than the world stays centred on it.
    expect(clampCenter({ x: 3, y: 50 }, 6, { width: 10_000, height: 860 }).x).toBe(50.5)
  })

  it('draws one extra cell of margin around the visible window', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 1, stage: { width: 700, height: 700 } })
    expect(view.range).toEqual({ min_x: 46, max_x: 54, min_y: 46, max_y: 54 })
  })

  it('maps stage pixels to cells at every zoom level, north up', () => {
    for (const zoom of LEVELS) {
      const view = mapWindow({ center: { x: 40, y: 60 }, zoom, stage: STAGE })
      const { px, py } = worldToStage({ x: 42, y: 57 }, view)
      expect(cellAtStagePoint(px, py, view)).toEqual({ x: 42, y: 57 })
      expect(cellAtStagePoint(px + view.cellSize * 0.45, py - view.cellSize * 0.45, view)).toEqual({ x: 42, y: 57 })
      expect(cellAtStagePoint(px, py - view.cellSize, view)).toEqual({ x: 42, y: 58 })
    }
  })

  it('returns no cell outside the world', () => {
    const view = mapWindow({ center: { x: 50, y: 50 }, zoom: 6, stage: { width: 10_000, height: 860 } })
    expect(cellAtStagePoint(1, 400, view)).toBeNull()
  })

  it('keeps the world point under the pointer when zooming', () => {
    const before = mapWindow({ center: { x: 50, y: 50 }, zoom: 3, stage: STAGE })
    const anchor = stageToWorld(300, 200, before)
    const center = centerAfterZoom({ anchor, center: before.center, fromZoom: 3, toZoom: 1, stage: STAGE })
    const after = mapWindow({ center, zoom: 1, stage: STAGE })
    const { px, py } = worldToStage(anchor, after)
    expect(px).toBeCloseTo(300)
    expect(py).toBeCloseTo(200)
  })

  it('pans with the pointer and with the arrow keys (Shift: 5 cells)', () => {
    expect(panByPixels({ x: 50, y: 50 }, { dx: 40, dy: -20 }, 20)).toEqual({ x: 48, y: 49 })
    expect(panByKey({ x: 50, y: 50 }, 'ArrowRight', false)).toEqual({ x: 51, y: 50 })
    expect(panByKey({ x: 50, y: 50 }, 'ArrowUp', true)).toEqual({ x: 50, y: 55 })
    expect(panByKey({ x: 50, y: 50 }, 'ArrowDown', false)).toEqual({ x: 50, y: 49 })
    expect(panByKey({ x: 50, y: 50 }, 'a', false)).toBeNull()
  })

  it('pads the markers bounds by half the window, clamped to the world', () => {
    const padded = paddedBounds({ min_x: 41, max_x: 60, min_y: 1, max_y: 10 })
    expect(padded).toEqual({ min_x: 31, max_x: 70, min_y: 1, max_y: 15 })
    expect(boundsContain(padded, { min_x: 45, max_x: 65, min_y: 2, max_y: 12 })).toBe(true)
    expect(boundsContain(padded, { min_x: 45, max_x: 71, min_y: 2, max_y: 12 })).toBe(false)
  })
})
