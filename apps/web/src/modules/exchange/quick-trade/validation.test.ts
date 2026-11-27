import { describe, expect, it } from 'vitest'
import { ExchangeResource, ExchangeSide } from '@eoneom/api-client'

import { firstQuickTradeIssue, parsePositiveInteger } from './validation'

const base = {
  side: ExchangeSide.SELL,
  resource: ExchangeResource.PLASTIC,
  tradingPostCount: 1,
  lots: 3 as number | null,
  price: 12 as number | null,
  openOrderCount: 1 as number | null,
  openOrderLimit: 3 as number | null,
  stock: { plastic: 240, mushroom: 0, plasma: 0, water: 20 },
  estimate: {
    enough_resources: true,
    reserved_carriers: [ { code: 'light_transporter', count: 1 } ] as unknown[] | null,
    carrier_load: 300,
    available_carrier_capacity: 11_000,
  },
  estimateFailed: false,
}

describe('quick trade validation (slice 046)', () => {
  it('parses integer fields of at least 1', () => {
    expect(parsePositiveInteger('3')).toBe(3)
    expect(parsePositiveInteger('')).toBeNull()
    expect(parsePositiveInteger('0')).toBeNull()
    expect(parsePositiveInteger('2.5')).toBeNull()
    expect(parsePositiveInteger('abc')).toBeNull()
  })

  it('accepts a valid order', () => {
    expect(firstQuickTradeIssue(base)).toBeNull()
  })

  it('reports the missing trading post before anything else', () => {
    expect(firstQuickTradeIssue({ ...base, tradingPostCount: 0, lots: null, price: null })).toEqual({
      code: 'no-trading-post',
      message: 'Construisez un Comptoir d\'échange pour accéder à la bourse de faction.',
    })
  })

  it('reports only the first failing rule, in the server order', () => {
    const everythingWrong = {
      ...base,
      lots: null,
      price: null,
      openOrderCount: 3,
      openOrderLimit: 3,
      estimate: { ...base.estimate, enough_resources: false, reserved_carriers: null },
    }
    expect(firstQuickTradeIssue(everythingWrong)?.code).toBe('lots-invalid')
    expect(firstQuickTradeIssue({ ...everythingWrong, lots: 3 })?.code).toBe('price-invalid')
    expect(firstQuickTradeIssue({ ...everythingWrong, lots: 3, price: 12 })?.code).toBe('order-limit')
    expect(firstQuickTradeIssue({ ...everythingWrong, lots: 3, price: 12, openOrderCount: 1 })?.code).toBe('not-enough-stock')
    expect(firstQuickTradeIssue({
      ...everythingWrong,
      lots: 3,
      price: 12,
      openOrderCount: 1,
      estimate: { ...everythingWrong.estimate, enough_resources: true },
    })?.code).toBe('not-enough-carriers')
  })

  it('writes the messages with their numbers', () => {
    expect(firstQuickTradeIssue({ ...base, lots: null })?.message)
      .toBe('La quantité doit être un nombre entier de lots (au moins 1).')
    expect(firstQuickTradeIssue({ ...base, price: null })?.message)
      .toBe('Le prix doit être un nombre entier d\'eau pure par lot (au moins 1).')
    expect(firstQuickTradeIssue({ ...base, openOrderCount: 3 })?.message)
      .toBe('Ce comptoir a déjà 3 ordres ouverts sur 3 : annulez-en un ou améliorez le comptoir.')
    expect(firstQuickTradeIssue({ ...base, estimate: { ...base.estimate, enough_resources: false } })?.message)
      .toBe('Stock insuffisant : 240 plastique disponibles, 300 nécessaires.')
    expect(firstQuickTradeIssue({
      ...base,
      side: ExchangeSide.BUY,
      estimate: { ...base.estimate, enough_resources: false },
    })?.message).toBe('Eau pure insuffisante : 20 disponibles, 36 nécessaires.')
    expect(firstQuickTradeIssue({
      ...base,
      estimate: { ...base.estimate, reserved_carriers: null, carrier_load: 300, available_carrier_capacity: 120 },
    })?.message).toBe('Transporteurs insuffisants : capacité 120 disponible, 300 nécessaire. Recrutez des transporteurs ou libérez-en.')
  })

  it('reports a failed estimate and waits silently for a loading one', () => {
    expect(firstQuickTradeIssue({ ...base, estimate: undefined, estimateFailed: true })?.message)
      .toBe('Estimation indisponible, réessayez.')
    expect(firstQuickTradeIssue({ ...base, estimate: undefined })).toBeNull()
  })
})
