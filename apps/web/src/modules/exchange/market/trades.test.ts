import { describe, expect, it } from 'vitest'

import { priceLinePoints } from './trades'

describe('exchange price line', () => {
  it('draws the trades oldest to newest, scaled between the lowest and highest price', () => {
    // Newest first, as the API returns them.
    const trades = [
      { price: 30, lots: 1, executed_at: 3 },
      { price: 10, lots: 1, executed_at: 2 },
      { price: 20, lots: 1, executed_at: 1 },
    ]
    expect(priceLinePoints(trades)).toBe('0,30 150,60 300,0')
  })

  it('draws a flat line for a single price and nothing without trades', () => {
    expect(priceLinePoints([ { price: 5, lots: 2, executed_at: 1 } ])).toBe('150,30')
    expect(priceLinePoints([])).toBe('')
  })
})
