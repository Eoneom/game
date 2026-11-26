import { describe, expect, it } from 'vitest'
import {
  battleResultKind,
  battleResultLabel,
  formatCombatModifiers,
} from '#communication/report/translations'

describe('battleResultKind', () => {
  it('is a victory when the winner matches the perspective', () => {
    expect(battleResultKind({ perspective: 'attacker', winner: 'attacker' })).toBe('victory')
    expect(battleResultKind({ perspective: 'defender', winner: 'defender' })).toBe('victory')
  })

  it('is a defeat when the other side wins', () => {
    expect(battleResultKind({ perspective: 'attacker', winner: 'defender' })).toBe('defeat')
    expect(battleResultKind({ perspective: 'defender', winner: 'attacker' })).toBe('defeat')
  })

  it('is a draw for both sides on a draw', () => {
    expect(battleResultKind({ perspective: 'attacker', winner: 'draw' })).toBe('draw')
    expect(battleResultKind({ perspective: 'defender', winner: 'draw' })).toBe('draw')
  })
})

describe('battleResultLabel', () => {
  it('returns French labels', () => {
    expect(battleResultLabel({ perspective: 'attacker', winner: 'attacker' })).toBe('Victoire')
    expect(battleResultLabel({ perspective: 'attacker', winner: 'defender' })).toBe('Défaite')
    expect(battleResultLabel({ perspective: 'defender', winner: 'draw' })).toBe('Égalité')
  })
})

describe('formatCombatModifiers', () => {
  it('formats attack and life bonuses in French', () => {
    expect(formatCombatModifiers({ attack: 1.09, life: 1.06 })).toBe('+9 % attaque, +6 % vie')
  })

  it('omits neutral modifiers', () => {
    expect(formatCombatModifiers({ attack: 1, life: 1.03 })).toBe('+3 % vie')
    expect(formatCombatModifiers({ attack: 1, life: 1 })).toBeNull()
    expect(formatCombatModifiers(undefined)).toBeNull()
  })
})
