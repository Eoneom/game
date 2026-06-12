import { WORLD_SIZE } from '#core/world/constant/size'
import { normalizeCoordinate } from '#core/world/helper'
import assert from 'assert'

describe('WorldHelper', () => {
  describe('normalizeCoordinate', () => {
    it('should return 1 when random number is 0', () => {
      const coordinate = normalizeCoordinate(0)

      assert.strictEqual(coordinate, 1)
    })

    it('should return world size when random number is near 1', () => {
      const coordinate = normalizeCoordinate(0.9999)

      assert.strictEqual(coordinate, WORLD_SIZE)
    })
  })
})
