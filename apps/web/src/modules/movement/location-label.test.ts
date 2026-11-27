import { describe, expect, it } from 'vitest'

import { formatLocationLabel } from '#movement/location-label'

describe('location labels (slice 045)', () => {
  const directory = {
    cities: [ { id: 'c1', name: 'Alpha', coordinates: { x: 3, y: 4 } } ],
    outposts: [ { id: 'o1', coordinates: { x: 5, y: 6 } } ],
    allied_cities: [ { tag: 'VEIL', name: 'Bastion', coordinates: { x: 7, y: 8 } } ],
  }

  it('names own cities, own outposts and allied cities, else shows the coordinates', () => {
    expect(formatLocationLabel({ x: 3, y: 4 }, directory)).toBe('Alpha (3.4)')
    expect(formatLocationLabel({ x: 5, y: 6 }, directory)).toBe('Avant-poste (5.6)')
    expect(formatLocationLabel({ x: 7, y: 8 }, directory)).toBe('[VEIL] Bastion (7.8)')
    expect(formatLocationLabel({ x: 9, y: 9 }, directory)).toBe('9.9')
  })
})
