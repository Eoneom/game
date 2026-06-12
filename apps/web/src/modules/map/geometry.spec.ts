import {
  MAP_FIT_PADDING,
  cellCenter,
  cellTopLeft,
  mapViewScaleAndPosition,
} from '#map/geometry'
import { CELL_WORLD_SIZE } from '#map/helper'
import { ViewportBounds } from '#map/viewport'

const bounds: ViewportBounds = {
  min_x: 1,
  max_x: 10,
  min_y: 1,
  max_y: 10,
}

describe('map geometry', () => {
  describe('cellTopLeft', () => {
    it('places bottom-left game cell at origin x and high y within bounds', () => {
      const cell = CELL_WORLD_SIZE
      expect(cellTopLeft(1, 1, bounds, cell)).toEqual({
        x: 0,
        y: 900 
      })
      expect(cellTopLeft(1, 10, bounds, cell)).toEqual({
        x: 0,
        y: 0 
      })
      expect(cellTopLeft(10, 10, bounds, cell)).toEqual({
        x: 900,
        y: 0 
      })
    })

    it('offsets from viewport min coordinates', () => {
      const cell = CELL_WORLD_SIZE
      const shifted: ViewportBounds = {
        min_x: 5,
        max_x: 14,
        min_y: 5,
        max_y: 14,
      }
      expect(cellTopLeft(5, 5, shifted, cell)).toEqual({
        x: 0,
        y: 900 
      })
      expect(cellTopLeft(6, 5, shifted, cell)).toEqual({
        x: 100,
        y: 900 
      })
    })
  })

  describe('cellCenter', () => {
    it('is cell corner plus half a cell', () => {
      const cell = CELL_WORLD_SIZE
      const top = cellTopLeft(2, 3, bounds, cell)
      const half = cell / 2
      expect(cellCenter(2, 3, bounds, cell)).toEqual({
        x: top.x + half,
        y: top.y + half,
      })
    })
  })

  describe('mapViewScaleAndPosition', () => {
    it('returns unit scale and origin when stage is too small', () => {
      expect(mapViewScaleAndPosition(31, 400, bounds)).toEqual({
        scale: 1,
        position: {
          x: 0,
          y: 0 
        },
      })
      expect(mapViewScaleAndPosition(400, 31, bounds)).toEqual({
        scale: 1,
        position: {
          x: 0,
          y: 0 
        },
      })
    })

    it('scales to fit both dimensions with padding and centers', () => {
      const mapExtent = 10 * CELL_WORLD_SIZE
      const w = 400
      const h = 400
      const { scale, position } = mapViewScaleAndPosition(w, h, bounds)
      const expectedScale = (Math.min(w, h) * MAP_FIT_PADDING) / mapExtent
      expect(scale).toBeCloseTo(expectedScale, 10)
      expect(position.x).toBeCloseTo((w - mapExtent * scale) / 2, 10)
      expect(position.y).toBeCloseTo((h - mapExtent * scale) / 2, 10)
    })

    it('uses the limiting dimension when stage is not square', () => {
      const mapExtent = 10 * CELL_WORLD_SIZE
      const w = 800
      const h = 400
      const { scale } = mapViewScaleAndPosition(w, h, bounds)
      expect(scale).toBeCloseTo((h * MAP_FIT_PADDING) / mapExtent, 10)
    })
  })
})
