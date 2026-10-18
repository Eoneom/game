import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  MAP_MAX_HALF_EXTENT,
  MAP_MIN_HALF_EXTENT,
  clampHalfExtent,
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
})
