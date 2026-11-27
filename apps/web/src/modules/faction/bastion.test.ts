import { describe, expect, it } from 'vitest'
import { DefenseCode, FactionCode, TroopCode, playableFactionCodes } from '@eoneom/api-client'

import { formatCombatModifiers } from '#communication/report/translations'
import { defenseImageSrc } from '#defense/image'
import { DefenseTranslations, formatAttackByRound } from '#defense/translations'
import { FactionTranslations } from '#faction/translations'
import { troopImageSrc } from '#troop/image'
import { TroopTranslations } from '#troop/translations'

describe('L\'Ordre du Bastion (slice 037)', () => {
  it('is the third playable faction, with its signup card copy', () => {
    expect(playableFactionCodes()).toEqual([
      FactionCode.THE_CONFEDERATION,
      FactionCode.THE_SYMBIOSIS,
      FactionCode.THE_BASTION_ORDER,
    ])
    expect(FactionTranslations[FactionCode.THE_BASTION_ORDER].name).toBe('L\'Ordre du Bastion')
    expect(FactionTranslations[FactionCode.THE_BASTION_ORDER].playstyle).toBe('Troupes lourdes, +15 % de vie en défense de ses villes')
  })

  it('names the roster and the faction defenses', () => {
    expect(TroopTranslations[TroopCode.SENTINEL].name).toBe('Vigie')
    expect(TroopTranslations[TroopCode.FIELD_ENGINEER].name).toBe('Ingénieur de campagne')
    expect(TroopTranslations[TroopCode.GRENADIER].name).toBe('Grenadier')
    expect(TroopTranslations[TroopCode.MOBILE_MORTAR].name).toBe('Mortier mobile')
    expect(DefenseTranslations[DefenseCode.FIELD_ARTILLERY].name).toBe('Artillerie de position')
    expect(DefenseTranslations[DefenseCode.BARBED_WIRE].name).toBe('Barbelés')
  })

  it('uses existing artwork as placeholders for the Bastion roster and defenses', () => {
    expect(troopImageSrc(TroopCode.GRENADIER)).toBe('/troops/legionnaire.png')
    expect(troopImageSrc(TroopCode.SIEGE_TANK)).toBe('/troops/war_machine.png')
    expect(defenseImageSrc(DefenseCode.FIELD_ARTILLERY)).toMatch(/\.png$/)
    expect(defenseImageSrc(DefenseCode.BARBED_WIRE)).toMatch(/\.png$/)
  })

  it('formats the field artillery per-round attack profile', () => {
    expect(formatAttackByRound([ 60, 50, 25, 20, 20 ])).toBe('60 / 50 / 25 / 20 / 20')
    expect(formatAttackByRound(undefined)).toBeNull()
  })

  it('shows the garrison bonus in the defender modifiers', () => {
    expect(formatCombatModifiers({ attack: 1, life: 1, garrison: 1.15 })).toBe('Garnison +15 % vie')
    expect(formatCombatModifiers({ attack: 1, life: 1.06, fortification: 1.03, garrison: 1.15 }))
      .toBe('+6 % vie, +3 % fortification, Garnison +15 % vie')
  })
})
