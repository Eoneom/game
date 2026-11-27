import { describe, expect, it } from 'vitest'
import { DefenseCode, FactionCode, TroopCode, playableFactionCodes } from '@eoneom/api-client'

import { regrowthLines } from '#communication/report/translations'
import { DefenseTranslations } from '#defense/translations'
import { FactionTranslations } from '#faction/translations'
import { troopImageSrc } from '#troop/image'
import { TroopTranslations } from '#troop/translations'

describe('La Symbiose (slice 036)', () => {
  it('is playable and every playable faction has a signup card copy', () => {
    expect(playableFactionCodes()).toContain(FactionCode.THE_SYMBIOSIS)
    for (const code of playableFactionCodes()) {
      expect(FactionTranslations[code].lore).toBeTruthy()
      expect(FactionTranslations[code].playstyle).toBeTruthy()
    }
    expect(FactionTranslations[FactionCode.THE_SYMBIOSIS].playstyle).toBe('Armées nombreuses, +10 % champignons, −10 % plastique')
  })

  it('names the roster and the faction defenses', () => {
    expect(TroopTranslations[TroopCode.ROOT_WARDEN].name).toBe('Garde-racine')
    expect(TroopTranslations[TroopCode.DRIFTING_SPORE].name).toBe('Spore errante')
    expect(DefenseTranslations[DefenseCode.MYCELIUM_WALL].name).toBe('Mur de mycélium')
    expect(DefenseTranslations[DefenseCode.SPORE_CLOUD].name).toBe('Nuage de spores')
  })

  it('uses existing artwork as placeholders for the Symbiose roster', () => {
    expect(troopImageSrc(TroopCode.ROOT_WARDEN)).toBe('/troops/legionnaire.png')
    expect(troopImageSrc(TroopCode.LEGIONNAIRE)).toBe('/troops/legionnaire.png')
    expect(troopImageSrc(TroopCode.CINDER_TITAN)).toBe('/troops/cinder_titan.png')
  })

  it('formats the mycelium regrowth line of the defender report', () => {
    expect(regrowthLines([ { code: DefenseCode.MYCELIUM_WALL, count: 3 } ])).toEqual([ 'Mur de mycélium : +3 repoussés' ])
    expect(regrowthLines([ { code: DefenseCode.MYCELIUM_WALL, count: 1 } ])).toEqual([ 'Mur de mycélium : +1 repoussé' ])
    expect(regrowthLines(undefined)).toEqual([])
  })
})
