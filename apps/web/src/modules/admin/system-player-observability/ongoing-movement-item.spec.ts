import { describe, expect, it } from 'vitest'

import { hasMovementCargo } from './ongoing-movement-item'

describe('hasMovementCargo', () => {
  it('is false when all resource amounts are zero', () => {
    expect(hasMovementCargo({ plastic: 0, mushroom: 0, plasma: 0 })).toBe(false)
  })

  it('is true when any resource amount is positive', () => {
    expect(hasMovementCargo({ plastic: 1, mushroom: 0, plasma: 0 })).toBe(true)
  })
})
