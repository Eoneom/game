import { describe, expect, it } from 'vitest'
import { FactionCode, OutpostType, TroopCode } from '@eoneom/api-client'

import {
  destinationStance,
  formatSpySuccessPreview,
  isScoutOnlySelection,
  isSpyActionAvailable,
  spySuccessPreview,
} from '#movement/spy'

describe('spy movement helpers (slice 030)', () => {
  it('accepts scouts-only selections', () => {
    expect(isScoutOnlySelection([{ code: TroopCode.EXPLORER, count: 2 }, { code: TroopCode.SEEKER, count: 1 }])).toBe(true)
    expect(isScoutOnlySelection([{ code: TroopCode.EXPLORER, count: 2 }, { code: TroopCode.LEGIONNAIRE, count: 1 }])).toBe(false)
    expect(isScoutOnlySelection([])).toBe(false)
  })

  it('reads the destination stance from the map settlements', () => {
    const settlements = {
      cities: [{ id: 'c', name: 'Bastion', player_id: 'p', faction_code: FactionCode.THE_ASH_LITURGY, coordinates: { x: 4, y: 4 } }],
      outposts: [{ id: 'o', player_id: 'q', faction_code: FactionCode.THE_CONFEDERATION, type: OutpostType.PERMANENT, coordinates: { x: 5, y: 5 } }],
    }
    const viewer_faction_code = FactionCode.THE_CONFEDERATION

    expect(destinationStance({ coordinates: { x: 4, y: 4 }, viewer_faction_code, settlements })).toBe('enemy')
    expect(destinationStance({ coordinates: { x: 5, y: 5 }, viewer_faction_code, settlements })).toBe('friendly')
    expect(destinationStance({ coordinates: { x: 6, y: 6 }, viewer_faction_code, settlements })).toBe('none')
  })

  it('offers « Espionner » for scouts aimed at a location that is not same-faction', () => {
    const scouts = [{ code: TroopCode.EXPLORER, count: 1 }]
    expect(isSpyActionAvailable({ troops: scouts, stance: 'enemy' })).toBe(true)
    expect(isSpyActionAvailable({ troops: scouts, stance: 'none' })).toBe(true)
    expect(isSpyActionAvailable({ troops: scouts, stance: 'friendly' })).toBe(false)
    expect(isSpyActionAvailable({ troops: scouts, stance: undefined })).toBe(false)
    expect(isSpyActionAvailable({ troops: [{ code: TroopCode.LEGIONNAIRE, count: 1 }], stance: 'enemy' })).toBe(false)
  })

  it('previews the odds from the known espionage level only', () => {
    expect(spySuccessPreview({ espionage_level: 1, scout_count: 1 })).toEqual({ floor: 0.05, best_case: 0.65 })
    expect(spySuccessPreview({ espionage_level: 2, scout_count: 4 })).toEqual({ floor: 0.05, best_case: 0.86 })
    expect(spySuccessPreview({ espionage_level: 5, scout_count: 1 }).best_case).toBe(0.95)
    expect(formatSpySuccessPreview({ floor: 0.05, best_case: 0.65 }))
      .toBe('≥ 5 % (jusqu\'à 65 % contre une cible sans Détection)')
  })
})
