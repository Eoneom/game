import { describe, expect, it } from 'vitest'

import { formatIncomingTarget, formatIncomingUnitCount } from '#movement/incoming/translations'

describe('incoming attack labels (slice 030)', () => {
  it('names the targeted location', () => {
    expect(formatIncomingTarget({ kind: 'city', id: 'c', name: 'Bastion', coordinates: { x: 3, y: 4 } })).toBe('Ville Bastion (3.4)')
    expect(formatIncomingTarget({ kind: 'outpost', id: 'o', name: null, coordinates: { x: 5, y: 6 } })).toBe('Avant-poste (5.6)')
    expect(formatIncomingTarget({ kind: 'field', id: null, name: null, coordinates: { x: 1, y: 1 } })).toBe('Troupes en campagne (1.1)')
  })

  it('shows the rounded army size', () => {
    expect(formatIncomingUnitCount(30)).toBe('≈ 30 unités')
    expect(formatIncomingUnitCount(0)).toBe('≈ 0 unité')
  })
})
