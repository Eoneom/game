import { describe, expect, it } from 'vitest'
import { TroopCode } from '@eoneom/api-client'

import {
  formatSpySuccessPreview,
  isScoutOnlySelection,
  spySuccessPreview,
} from '#movement/spy'

/** Destination stance and « Espionner » gating moved to the send wizard matrix (`send/actions.test.ts`, slice 045). */
describe('spy movement helpers (slice 030)', () => {
  it('accepts scouts-only selections', () => {
    expect(isScoutOnlySelection([{ code: TroopCode.EXPLORER, count: 2 }, { code: TroopCode.SEEKER, count: 1 }])).toBe(true)
    expect(isScoutOnlySelection([{ code: TroopCode.EXPLORER, count: 2 }, { code: TroopCode.LEGIONNAIRE, count: 1 }])).toBe(false)
    expect(isScoutOnlySelection([])).toBe(false)
  })

  it('previews the odds from the known espionage level only', () => {
    expect(spySuccessPreview({ espionage_level: 1, scout_count: 1 })).toEqual({ floor: 0.05, best_case: 0.65 })
    expect(spySuccessPreview({ espionage_level: 2, scout_count: 4 })).toEqual({ floor: 0.05, best_case: 0.86 })
    expect(spySuccessPreview({ espionage_level: 5, scout_count: 1 }).best_case).toBe(0.95)
    expect(formatSpySuccessPreview({ floor: 0.05, best_case: 0.65 }))
      .toBe('≥ 5 % (jusqu\'à 65 % contre une cible sans Détection)')
  })
})
