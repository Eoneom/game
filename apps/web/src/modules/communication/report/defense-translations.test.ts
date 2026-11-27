import { describe, expect, it } from 'vitest'
import { DefenseCode, TroopCode } from '@eoneom/api-client'

import {
  defenseLosses,
  formatCombatModifiers,
  formatShieldReduction,
} from '#communication/report/translations'

describe('battle report defenses (slice 029)', () => {
  it('keeps only defense loss lines', () => {
    expect(defenseLosses([
      { code: TroopCode.LEGIONNAIRE, count: 2 },
      { kind: 'defense', code: DefenseCode.RAMPART, count: 5 },
      { kind: 'troop', code: TroopCode.WAR_MACHINE, count: 1 },
      { kind: 'defense', code: DefenseCode.MINEFIELD, count: 3 },
    ])).toEqual([
      { code: DefenseCode.RAMPART, count: 5 },
      { code: DefenseCode.MINEFIELD, count: 3 },
    ])
  })

  it('formats the shield reduction', () => {
    expect(formatShieldReduction(0.3)).toBe('-30 %')
    expect(formatShieldReduction(0)).toBeNull()
    expect(formatShieldReduction(undefined)).toBeNull()
  })

  it('shows the Fortification bonus of the defender', () => {
    expect(formatCombatModifiers({ attack: 1, life: 1, fortification: 1.09 })).toBe('+9 % fortification')
    expect(formatCombatModifiers({ attack: 1, life: 1, fortification: 1 })).toBeNull()
  })
})
