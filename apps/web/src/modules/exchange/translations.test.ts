import { ExchangeResource } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import {
  formatDeliveryDuration,
  formatLotSize,
  formatLots,
  formatRelativeExpiry,
  formatReservedResources,
  formatTradeSpan,
} from './translations'

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

  it('lists the reserved resources in French', () => {
    expect(formatReservedResources({ plastic: 300, mushroom: 0, plasma: 0, water: 0 })).toBe('300 plastique')
    expect(formatReservedResources({ plastic: 0, mushroom: 0, plasma: 0, water: 45 })).toBe('45 eau pure')
  })

  it('says how long an order has left before it expires (slice 046)', () => {
    const now = 1_000_000
    const hour = 60 * 60 * 1000
    expect(formatRelativeExpiry(now + (6 * 24 + 4) * hour + 59_000, now)).toBe('6 j 4 h')
    expect(formatRelativeExpiry(now + 2 * 24 * hour, now)).toBe('2 j')
    expect(formatRelativeExpiry(now + 4 * hour + 5 * 60_000, now)).toBe('4 h 05')
    expect(formatRelativeExpiry(now + 12 * 60_000, now)).toBe('12 min')
    expect(formatRelativeExpiry(now - 1, now)).toBe('bientôt')
  })

  it('captions the time span of the price line (slice 046)', () => {
    const at = (day: number, hours: number, minutes: number) => new Date(2026, 10, day, hours, minutes).getTime()
    expect(formatTradeSpan([
      { executed_at: at(27, 9, 41) },
      { executed_at: at(26, 0, 0) },
      { executed_at: at(25, 14, 2) },
    ])).toBe('3 derniers échanges, du 25/11 14:02 au 27/11 09:41')
    expect(formatTradeSpan([ { executed_at: at(25, 14, 2) } ])).toBe('1 échange, le 25/11 14:02')
    expect(formatTradeSpan([])).toBe('')
  })
})
