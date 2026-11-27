import { describe, expect, it } from 'vitest'
import { ExchangeResource, ExchangeSide } from '@eoneom/api-client'

import { maxLots } from './max-lots'

const stock = (overrides: Partial<Record<'plastic' | 'mushroom' | 'plasma' | 'water', number>> = {}) => ({
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  water: 0,
  ...overrides,
})

describe('quick trade « Max » (slice 046)', () => {
  it('bounds a sell by the stock in whole lots', () => {
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      price: null,
      stock: stock({ plastic: 1250 }),
      availableCarrierCapacity: 100_000,
    })).toBe(12)
  })

  it('bounds a sell by the free carrier capacity', () => {
    // 11 000 capacity carries 110 lots of 100 plastic (weight 1)… but only 1 lot of plasma per 100 capacity.
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      price: null,
      stock: stock({ plastic: 1_000_000 }),
      availableCarrierCapacity: 11_000,
    })).toBe(110)
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASMA,
      price: null,
      stock: stock({ plasma: 500 }),
      availableCarrierCapacity: 1_050,
    })).toBe(10)
  })

  it('counts plasma lots of 1 unit', () => {
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASMA,
      price: null,
      stock: stock({ plasma: 7 }),
      availableCarrierCapacity: 1_000_000,
    })).toBe(7)
  })

  it('bounds a buy by the water at the price and by the carriers (water weighs 2)', () => {
    expect(maxLots({
      side: ExchangeSide.BUY,
      resource: ExchangeResource.MUSHROOM,
      price: 12,
      stock: stock({ water: 100 }),
      availableCarrierCapacity: 100_000,
    })).toBe(8)
    expect(maxLots({
      side: ExchangeSide.BUY,
      resource: ExchangeResource.MUSHROOM,
      price: 12,
      stock: stock({ water: 10_000 }),
      availableCarrierCapacity: 240,
    })).toBe(10)
  })

  it('is disabled without a price for a buy, without stock or before the estimate answered', () => {
    expect(maxLots({
      side: ExchangeSide.BUY,
      resource: ExchangeResource.PLASTIC,
      price: null,
      stock: stock({ water: 100 }),
      availableCarrierCapacity: 1000,
    })).toBeNull()
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      price: 3,
      stock: undefined,
      availableCarrierCapacity: 1000,
    })).toBeNull()
    expect(maxLots({
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      price: 3,
      stock: stock({ plastic: 100 }),
      availableCarrierCapacity: null,
    })).toBeNull()
  })
})
