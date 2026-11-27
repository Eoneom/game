import { describe, expect, it } from 'vitest'
import { TroopCode } from '@eoneom/api-client'

import {
  balanceOf,
  combatAttack,
  formatCoefficient,
  formatReportAge,
  formatStrength,
  reportAgeClass,
  terrainBin,
  terrainBinLabel,
  terrainValue,
} from '#map/overlays'
import { DEFAULT_MAP_LAYERS, parseLayers, serializeLayers, validateMapSearch } from '#map/search'
import { Route as OutpostMapRoute } from '../../routes/outpost/$outpostId/world/map'
import { Route as CityMapRoute } from '../../routes/city/$cityId/world/map'

const HOUR = 3_600_000

describe('terrain bonus overlay (slice 044)', () => {
  it('splits coefficients into five bins', () => {
    expect([ 0.5, 0.79, 0.8, 1.09, 1.1, 1.39, 1.4, 1.69, 1.7, 2 ].map(terrainBin)).toEqual([ 0, 0, 1, 1, 2, 2, 3, 3, 4, 4 ])
    expect(terrainBinLabel(0)).toBe('< ×0,8')
    expect(terrainBinLabel(2)).toBe('×1,1 – ×1,4')
    expect(terrainBinLabel(4)).toBe('≥ ×1,7')
  })

  it('reads the chosen metric, « Mixte » being the mean of both', () => {
    const cell = { plastic: 1.6, mushroom: 0.8, solar: 1 }
    expect(terrainValue(cell, 'plastic')).toBe(1.6)
    expect(terrainValue(cell, 'mushroom')).toBe(0.8)
    expect(terrainValue(cell, 'mixed')).toBeCloseTo(1.2)
    expect(formatCoefficient(1.42)).toBe('×1,42')
  })
})

describe('targets and threats overlay (slice 044)', () => {
  it('classes spy report ages: fresh < 6 h, aging 6–24 h, stale > 24 h', () => {
    const now = 100 * HOUR
    expect(reportAgeClass(now - 5 * HOUR, now)).toBe('fresh')
    expect(reportAgeClass(now - 6 * HOUR, now)).toBe('aging')
    expect(reportAgeClass(now - 24 * HOUR, now)).toBe('aging')
    expect(reportAgeClass(now - 25 * HOUR, now)).toBe('stale')
    expect(formatReportAge(now - 2 * HOUR, now)).toBe('2 h')
    expect(formatReportAge(now - 12 * 60_000, now)).toBe('12 min')
    expect(formatReportAge(now - 72 * HOUR, now)).toBe('3 j')
  })

  it('rates the balance against the target life: ≥ 1.5 favorable, 0.75–1.5 uncertain, < 0.75 risky', () => {
    expect(balanceOf({ attack: 150, targetLife: 100 })).toBe('favorable')
    expect(balanceOf({ attack: 149, targetLife: 100 })).toBe('uncertain')
    expect(balanceOf({ attack: 75, targetLife: 100 })).toBe('uncertain')
    expect(balanceOf({ attack: 74, targetLife: 100 })).toBe('risky')
    expect(balanceOf({ attack: 1, targetLife: 0 })).toBe('favorable')
  })

  it('prefixes « ≥ » when the report did not reveal the defenses', () => {
    expect(formatStrength({ attack: 1200, life: 3400, defenses_known: true })).toMatch(/^ATK ≈ 1\s200 · VIE ≈ 3\s400$/)
    expect(formatStrength({ attack: 1200, life: 3400, defenses_known: false })).toMatch(/^≥ ATK ≈ 1\s200/)
  })

  it('counts combat units in full and scouts at a quarter, like the server', () => {
    expect(combatAttack([ { code: TroopCode.PENITENT_HORDE, count: 10 } ])).toBe(140)
    expect(combatAttack([ { code: TroopCode.EXPLORER, count: 4 } ])).toBe(2)
    expect(combatAttack([ { code: TroopCode.LIGHT_TRANSPORTER, count: 10 } ])).toBe(0)
  })
})

describe('map URL (slice 044)', () => {
  it('round-trips the layers, the default being left out', () => {
    expect(parseLayers(undefined)).toEqual(DEFAULT_MAP_LAYERS)
    expect(serializeLayers(DEFAULT_MAP_LAYERS)).toBeUndefined()
    const layers = { movements: false, terrain: 'mushroom' as const, targets: true }
    expect(serializeLayers(layers)).toBe('terrain:mushroom,targets')
    expect(parseLayers('terrain:mushroom,targets')).toEqual(layers)
    expect(parseLayers('terrain')).toEqual({ movements: false, terrain: 'plastic', targets: false })
    expect(parseLayers('')).toEqual({ movements: false, terrain: null, targets: false })
    expect(serializeLayers({ movements: false, terrain: null, targets: false })).toBe('')
  })

  it('ignores invalid values', () => {
    expect(parseLayers('bogus')).toEqual(DEFAULT_MAP_LAYERS)
    expect(parseLayers('movements,bogus,terrain:lava')).toEqual({ movements: true, terrain: 'plastic', targets: false })
    expect(validateMapSearch({ x: '12', y: '7', zoom: '5', layers: 'targets,movements' })).toEqual({ x: 12, y: 7, zoom: 5, layers: 'movements,targets' })
    expect(validateMapSearch({ x: 0, y: 7, zoom: 9, layers: 'nope' })).toEqual({ x: undefined, y: undefined, zoom: undefined, layers: undefined })
    expect(validateMapSearch({ x: 12, zoom: 'abc' })).toEqual({ x: undefined, y: undefined, zoom: undefined, layers: undefined })
  })

  it('is accepted by the city and the outpost map routes', () => {
    const raw = { x: '40', y: '51', zoom: '2', layers: 'terrain:mixed' }
    const validate = (route: { options: unknown }) =>
      (route.options as { validateSearch: (search: Record<string, unknown>) => unknown }).validateSearch(raw)
    expect(validate(CityMapRoute)).toEqual({ x: 40, y: 51, zoom: 2, layers: 'terrain:mixed' })
    expect(validate(OutpostMapRoute)).toEqual({ x: 40, y: 51, zoom: 2, layers: 'terrain:mixed' })
  })
})
