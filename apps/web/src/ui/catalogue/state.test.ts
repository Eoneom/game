import { describe, expect, it } from 'vitest'

import { catalogueBadge } from '#ui/catalogue/badge'
import {
  CatalogueCardStateInput,
  CatalogueCityResources,
  catalogueCardState,
  isDimmedCardState,
  isLockedCardState
} from '#ui/catalogue/state'

const city = (overrides: Partial<CatalogueCityResources> = {}): CatalogueCityResources => ({
  stock: { plastic: 1000, mushroom: 1000, plasma: 100, water: 50 },
  earnings_per_second: { plastic: 1, mushroom: 2, plasma: 0.5, water: 0 },
  warehouses_capacity: { plastic: 5000, mushroom: 5000 },
  ...overrides,
})

const base: CatalogueCardStateInput = {
  catalogue: 'building',
  cost: { plastic: 100, mushroom: 100, plasma: 0 },
  city: city(),
}

const unmet = [
  { name: 'Laboratoire de recherche', level: 3 },
  { name: 'Architecture', level: 2 },
]

describe('catalogueCardState (043)', () => {
  it('follows the priority order: in progress, queued, missing requirement, capped, queue full, resources', () => {
    const everything: CatalogueCardStateInput = {
      ...base,
      in_progress: { remaining_seconds: 240 },
      queued: { count: 2 },
      unmet_requirements: unmet,
      level_cap: { used: 100, maximum: 100 },
      queue: { active: true, length: 3, limit: 3 },
      cost: { plastic: 9000, mushroom: 0, plasma: 0 },
    }
    expect(catalogueCardState(everything).kind).toBe('in_progress')
    expect(catalogueCardState({ ...everything, in_progress: undefined }).kind).toBe('queued')
    expect(catalogueCardState({ ...everything, in_progress: undefined, queued: undefined }).kind)
      .toBe('missing_requirement')
    expect(catalogueCardState({ ...everything, in_progress: undefined, queued: { count: 0 }, unmet_requirements: [] }).kind)
      .toBe('capped')
    expect(catalogueCardState({
      ...everything,
      in_progress: undefined,
      queued: undefined,
      unmet_requirements: [],
      level_cap: undefined,
    }).kind).toBe('queue_full')
    expect(catalogueCardState({
      ...everything,
      in_progress: undefined,
      queued: undefined,
      unmet_requirements: [],
      level_cap: undefined,
      queue: { active: true, length: 1, limit: 3 },
    }).kind).toBe('insufficient_resources')
    expect(catalogueCardState(base)).toEqual({ kind: 'available', catalogue: 'building' })
  })

  it('names the first unmet requirement and counts the others', () => {
    const state = catalogueCardState({ ...base, unmet_requirements: unmet })
    expect(state).toEqual({ kind: 'missing_requirement', first: unmet[0], more: 1 })
    expect(catalogueBadge(state)?.text).toBe('Requiert : Laboratoire de recherche niv. 3 +1')
    expect(catalogueBadge(catalogueCardState({ ...base, unmet_requirements: [ unmet[1] ] }))?.text)
      .toBe('Requiert : Architecture niv. 2')
  })

  it('caps buildings only when a level cap is given (capped buildings) and it is reached', () => {
    expect(catalogueCardState({ ...base, level_cap: { used: 100, maximum: 100 } }))
      .toEqual({ kind: 'capped', reason: 'building_levels' })
    expect(catalogueCardState({ ...base, level_cap: { used: 99, maximum: 100 } }).kind).toBe('available')
    // The Enceinte passes no level cap.
    expect(catalogueCardState(base).kind).toBe('available')
  })

  it('caps defenses when free defense points are below one unit', () => {
    const defense: CatalogueCardStateInput = { ...base, catalogue: 'defense' }
    expect(catalogueCardState({ ...defense, defense_capacity: { free: 1, points: 2 } }))
      .toEqual({ kind: 'capped', reason: 'defense_capacity' })
    expect(catalogueCardState({ ...defense, defense_capacity: { free: 2, points: 2 } }))
      .toEqual({ kind: 'available', catalogue: 'defense' })
  })

  it('reports a full queue only while something else runs; no slot counts as full', () => {
    expect(catalogueCardState({ ...base, queue: { active: true, length: 3, limit: 3 } }).kind).toBe('queue_full')
    expect(catalogueCardState({ ...base, queue: { active: true, length: 2, limit: 3 } }).kind).toBe('available')
    expect(catalogueCardState({ ...base, queue: { active: false, length: 0, limit: 0 } }).kind).toBe('available')
    // Recruitment / fortification without a command center / Enceinte: no waiting slot.
    expect(catalogueCardState({ ...base, catalogue: 'troop', queue: { active: true, length: 0, limit: 0 } }).kind)
      .toBe('queue_full')
  })

  it('tells when the missing resources will be there', () => {
    const state = catalogueCardState({
      ...base,
      cost: { plastic: 1600, mushroom: 1400, plasma: 0 },
    })
    // plastic: 600 / 1 = 600 s, mushroom: 400 / 2 = 200 s → 600 s
    expect(state).toEqual({ kind: 'insufficient_resources', warehouse_too_small: false, affordable_in_seconds: 600 })
    expect(catalogueBadge(state)).toEqual({ text: 'Ressources insuffisantes', detail: 'dans 10 min', tone: 'red' })
  })

  it('gives no time when a short resource has no production', () => {
    const state = catalogueCardState({
      ...base,
      city: city({ earnings_per_second: { plastic: 0, mushroom: 2, plasma: 0, water: 0 } }),
      cost: { plastic: 1600, mushroom: 0, plasma: 0 },
    })
    expect(state).toEqual({ kind: 'insufficient_resources', warehouse_too_small: false })
    expect(catalogueBadge(state)?.detail).toBeUndefined()
  })

  it('says the warehouse is too small when a cost exceeds its capacity', () => {
    const state = catalogueCardState({ ...base, cost: { plastic: 6000, mushroom: 0, plasma: 0 } })
    expect(state).toEqual({ kind: 'insufficient_resources', warehouse_too_small: true })
    expect(catalogueBadge(state)?.detail).toBe('Entrepôt trop petit')
  })

  it('ignores water when it costs nothing and checks it otherwise (no warehouse cap)', () => {
    expect(catalogueCardState({ ...base, cost: { plastic: 0, mushroom: 0, plasma: 0, water: 0 } }).kind).toBe('available')
    expect(catalogueCardState({
      ...base,
      city: city({ stock: { plastic: 1000, mushroom: 1000, plasma: 100, water: 0 } }),
      cost: { plastic: 0, mushroom: 0, plasma: 0 },
    }).kind).toBe('available')
    expect(catalogueCardState({ ...base, cost: { plastic: 0, mushroom: 0, plasma: 0, water: 999_999 } }))
      .toEqual({ kind: 'insufficient_resources', warehouse_too_small: false })
  })

  it('skips the resource check until the city is loaded', () => {
    expect(catalogueCardState({ ...base, city: undefined, cost: { plastic: 1e9, mushroom: 0, plasma: 0 } }).kind)
      .toBe('available')
  })

  it('flags dimmed and locked states', () => {
    expect(isDimmedCardState({ kind: 'capped', reason: 'building_levels' })).toBe(true)
    expect(isDimmedCardState({ kind: 'missing_requirement', first: unmet[0], more: 0 })).toBe(true)
    expect(isDimmedCardState({ kind: 'queue_full' })).toBe(false)
    expect(isLockedCardState({ kind: 'missing_requirement', first: unmet[0], more: 0 })).toBe(true)
    expect(isLockedCardState({ kind: 'capped', reason: 'defense_capacity' })).toBe(false)
  })
})

describe('catalogueBadge (043)', () => {
  it('writes the French copy of every state', () => {
    expect(catalogueBadge({ kind: 'in_progress', remaining_seconds: 245 })).toEqual({ text: 'En cours', detail: '4 min', tone: 'amber' })
    expect(catalogueBadge({ kind: 'in_progress', remaining_units: 12 })?.detail).toBe('12 restants')
    expect(catalogueBadge({ kind: 'in_progress', remaining_units: 1 })?.detail).toBe('1 restant')
    expect(catalogueBadge({ kind: 'queued', count: 1 })).toEqual({ text: 'En file', tone: 'amber_outline' })
    expect(catalogueBadge({ kind: 'queued', count: 2 })?.text).toBe('En file ×2')
    expect(catalogueBadge({ kind: 'queued', count: 1, target_level: 6 })?.text).toBe('En file → niv. 6')
    expect(catalogueBadge({ kind: 'capped', reason: 'building_levels' })?.text).toBe('Plafond de niveaux atteint')
    expect(catalogueBadge({ kind: 'capped', reason: 'defense_capacity' })?.text).toBe('Capacité de défense pleine')
    expect(catalogueBadge({ kind: 'queue_full' })).toEqual({ text: 'File pleine', tone: 'grey' })
    expect(catalogueBadge({ kind: 'available', catalogue: 'building' })?.text).toBe('Améliorable')
    expect(catalogueBadge({ kind: 'available', catalogue: 'technology' })?.text).toBe('Recherchable')
    expect(catalogueBadge({ kind: 'available', catalogue: 'troop' })?.text).toBe('Recrutable')
    expect(catalogueBadge({ kind: 'available', catalogue: 'defense' })).toEqual({ text: 'Constructible', tone: 'green' })
    expect(catalogueBadge({ kind: 'none' })).toBeNull()
  })
})
