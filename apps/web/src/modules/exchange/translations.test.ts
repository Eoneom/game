import { ExchangeResource } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { formatDeliveryDuration, formatLotSize, formatLots } from './translations'

describe('exchange translations', () => {
  it('describes the lot of each pair', () => {
    expect(formatLotSize(ExchangeResource.PLASTIC)).toBe('1 lot = 100 plastique')
    expect(formatLotSize(ExchangeResource.PLASMA)).toBe('1 lot = 1 plasma')
    expect(formatLots(ExchangeResource.MUSHROOM, 3)).toBe('3 lots (300 champignon)')
    expect(formatLots(ExchangeResource.PLASMA, 1)).toBe('1 lot (1 plasma)')
  })

  it('formats the delivery time', () => {
    expect(formatDeliveryDuration(30_000)).toBe('1 min')
    expect(formatDeliveryDuration(12 * 60_000)).toBe('12 min')
    expect(formatDeliveryDuration(125 * 60_000)).toBe('2 h 05 min')
  })
})
