import {
  CITY_MAP_INITIAL_HALF_EXTENT,
  INITIAL_VIEWPORT_HALF_EXTENT,
  MAP_MAX_HALF_EXTENT,
  MAP_MIN_HALF_EXTENT,
  MAX_VIEWPORT_SIDE,
  PREFETCH_MARGIN_CELLS,
  clampHalfExtent,
  fetchBoundsAround,
  viewportBoundsAround,
  viewportSideLength,
} from '#map/viewport'

describe('viewport', () => {
  describe('viewportSideLength', () => {
    it('is 2 * half + 1', () => {
      expect(viewportSideLength(5)).toBe(11)
      expect(viewportSideLength(MAP_MAX_HALF_EXTENT)).toBe(19)
    })
  })

  describe('clampHalfExtent', () => {
    it('clamps to configured min and max', () => {
      expect(clampHalfExtent(0)).toBe(MAP_MIN_HALF_EXTENT)
      expect(clampHalfExtent(100)).toBe(MAP_MAX_HALF_EXTENT)
      expect(clampHalfExtent(5)).toBe(5)
    })
  })

  describe('viewportBoundsAround', () => {
    it('centers on coordinates with default half extent', () => {
      const bounds = viewportBoundsAround({
        x: 50,
        y: 50,
      })
      expect(bounds).toEqual({
        min_x: 50 - INITIAL_VIEWPORT_HALF_EXTENT,
        max_x: 50 + INITIAL_VIEWPORT_HALF_EXTENT,
        min_y: 50 - INITIAL_VIEWPORT_HALF_EXTENT,
        max_y: 50 + INITIAL_VIEWPORT_HALF_EXTENT,
      })
    })

    it('uses custom half extent', () => {
      const bounds = viewportBoundsAround({
        x: 20,
        y: 30,
      }, 3)
      expect(bounds).toEqual({
        min_x: 17,
        max_x: 23,
        min_y: 27,
        max_y: 33,
      })
    })

    it('clips to world edges', () => {
      const bounds = viewportBoundsAround({
        x: 2,
        y: 99,
      }, 5)
      expect(bounds).toEqual({
        min_x: 1,
        max_x: 7,
        min_y: 94,
        max_y: 100,
      })
    })

    it('city map opens tighter than bootstrap default', () => {
      expect(CITY_MAP_INITIAL_HALF_EXTENT).toBeLessThan(INITIAL_VIEWPORT_HALF_EXTENT)
      const bounds = viewportBoundsAround({
        x: 50,
        y: 50,
      }, CITY_MAP_INITIAL_HALF_EXTENT)
      expect(bounds.max_x - bounds.min_x + 1).toBe(7)
    })

    it('never exceeds server max viewport side', () => {
      const bounds = viewportBoundsAround({
        x: 50,
        y: 50,
      }, MAP_MAX_HALF_EXTENT)
      const sideX = bounds.max_x - bounds.min_x + 1
      const sideY = bounds.max_y - bounds.min_y + 1
      expect(sideX).toBeLessThanOrEqual(20)
      expect(sideY).toBeLessThanOrEqual(20)
    })
  })

  describe('fetchBoundsAround', () => {
    it('expands visible bounds by prefetch margin', () => {
      const center = {
        x: 50,
        y: 50,
      }
      const visible = viewportBoundsAround(center, 3)
      const fetch = fetchBoundsAround(center, 3)
      expect(fetch.min_x).toBe(visible.min_x - PREFETCH_MARGIN_CELLS)
      expect(fetch.max_x).toBe(visible.max_x + PREFETCH_MARGIN_CELLS)
    })

    it('clamps fetch side to MAX_VIEWPORT_SIDE', () => {
      const fetch = fetchBoundsAround({
        x: 50,
        y: 50,
      }, MAP_MAX_HALF_EXTENT)
      const side = fetch.max_x - fetch.min_x + 1
      expect(side).toBeLessThanOrEqual(MAX_VIEWPORT_SIDE)
    })
  })
})
