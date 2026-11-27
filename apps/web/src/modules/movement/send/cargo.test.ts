import { describe, expect, it } from 'vitest'

import { cargoLoad, cargoMaximums, fitCargo } from '#movement/send/cargo'

describe('transport cargo (slice 045)', () => {
  const stock = { plastic: 1000, mushroom: 1000, plasma: 10, water: 500 }

  it('weighs plasma and water', () => {
    expect(cargoLoad({ plastic: 10, mushroom: 5, plasma: 1, water: 3 })).toBe(10 + 5 + 100 + 6)
  })

  it('clamps stale URL cargo to the stock, then to the capacity', () => {
    expect(fitCargo({ cargo: { plastic: 5000, mushroom: 0, plasma: 0, water: 0 }, stock, capacity: 10_000 }).plastic).toBe(1000)
    expect(fitCargo({ cargo: { plastic: 800, mushroom: 400, plasma: 0, water: 0 }, stock, capacity: 1000 }))
      .toEqual({ plastic: 800, mushroom: 200, plasma: 0, water: 0 })
    expect(fitCargo({ cargo: { plastic: 0, mushroom: 0, plasma: 0, water: 100 }, stock: { ...stock, water: 0 }, capacity: 1000 }).water).toBe(0)
  })

  it('caps each input by the stock and the capacity left', () => {
    expect(cargoMaximums({ cargo: { plastic: 100, mushroom: 0, plasma: 0, water: 0 }, stock, capacity: 300 }))
      .toEqual({ plastic: 300, mushroom: 200, plasma: 2, water: 100 })
  })
})
