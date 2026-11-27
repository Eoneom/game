import { describe, expect, it } from 'vitest'
import { DefenseCode, FactionCode } from '@eoneom/api-client'

import { confederationDefenseLines } from '#communication/report/translations'
import { defenseImageSrc } from '#defense/image'
import { DefenseTranslations } from '#defense/translations'
import { FactionTranslations } from '#faction/translations'
import { formatSpeed } from '#helpers/transform'

const round = (overrides: { decoy_absorbed?: number, railgun_doubled?: boolean } = {}) => ({
  round: 1,
  attacker_attack_pool: 100,
  defender_attack_pool: 50,
  attacker_life_pool: 200,
  defender_life_pool: 300,
  attacker_losses: [],
  defender_losses: [],
  ...overrides,
})

describe('La Confédération identity (slice 039)', () => {
  it('shows the logistics bonus on the signup card', () => {
    expect(FactionTranslations[FactionCode.THE_CONFEDERATION].playstyle)
      .toBe('Logistique supérieure : +10 % de transport, +5 % de vitesse hors combat')
  })

  it('names the faction defenses and maps placeholder artwork', () => {
    expect(DefenseTranslations[DefenseCode.RAILGUN].name).toBe('Canon électromagnétique')
    expect(DefenseTranslations[DefenseCode.HOLO_DECOY].name).toBe('Leurres holographiques')
    expect(defenseImageSrc(DefenseCode.RAILGUN)).toMatch(/\.png$/)
    expect(defenseImageSrc(DefenseCode.HOLO_DECOY)).toMatch(/\.png$/)
  })

  it('adds the decoy absorption and railgun doubling lines to battle reports', () => {
    expect(confederationDefenseLines([
      round({ decoy_absorbed: 3, railgun_doubled: true }),
      round({ decoy_absorbed: 2 }),
      round(),
    ])).toEqual([
      'Leurres : 5 pertes absorbées',
      'Canon électromagnétique : tir doublé (siège)',
    ])
    expect(confederationDefenseLines([ round({ decoy_absorbed: 1 }) ])).toEqual([ 'Leurres : 1 perte absorbée' ])
    expect(confederationDefenseLines([ round(), round({ decoy_absorbed: 0, railgun_doubled: false }) ])).toEqual([])
  })

  it('shows boosted speeds without float noise', () => {
    expect(formatSpeed(1 * 1.05)).toBe('1.05')
    expect(formatSpeed(0.75 * 1.05)).toBe('0.788')
    expect(formatSpeed(1)).toBe('1')
  })
})
