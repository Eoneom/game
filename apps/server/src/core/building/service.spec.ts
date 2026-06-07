import assert from 'assert'
import { BuildingService } from '#core/building/service'

describe('BuildingService.getEnergy', () => {
  it('returns 0 at level 0', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 0 }), 0)
  })

  it('returns base value at level 1', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 1 }), 10)
  })

  it('returns exponential value at level 2', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 2 }), 15)
  })

  it('returns exponential value at level 3', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 3 }), 23)
  })
})
