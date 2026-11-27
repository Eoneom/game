import { describe, expect, it } from 'vitest'
import { BuildingCode, CombatStrategy, DefenseCode, TechnologyCode } from '@eoneom/api-client'

import { freeDefensePoints, maxBuildableCount } from '#defense/capacity'
import { defenseImageSrc } from '#defense/image'
import { DefenseTranslations } from '#defense/translations'
import { isBuildingListed, isLevelCappedBuilding } from '#building/layer'
import { BuildingTranslations } from '#building/translations'
import { buildingImageSrc } from '#building/image'
import { technology_branch, TechnologyBranch } from '#technology/branch'
import { TechnologyTranslations } from '#technology/translations'
import { CombatStrategyLabels } from '#movement/translations'

describe('defense capacity', () => {
  const capacity = { total: 40, used: 10, queued: 6 }

  it('counts existing and queued points against the Enceinte capacity', () => {
    expect(freeDefensePoints(capacity)).toBe(24)
    expect(freeDefensePoints({ total: 20, used: 15, queued: 10 })).toBe(0)
  })

  it('limits the build form to whole units that fit', () => {
    expect(maxBuildableCount({ capacity, points: 1 })).toBe(24)
    expect(maxBuildableCount({ capacity, points: 5 })).toBe(4)
    expect(maxBuildableCount({ capacity: { total: 0, used: 0, queued: 0 }, points: 2 })).toBe(0)
  })
})

describe('defense catalogue', () => {
  it('has French copy and an image for every defense', () => {
    for (const code of Object.values(DefenseCode)) {
      expect(DefenseTranslations[code].name).toBeTruthy()
      expect(DefenseTranslations[code].effect).toBeTruthy()
      expect(defenseImageSrc(code)).toMatch(/\.png$/)
    }
    expect(DefenseTranslations[DefenseCode.RAMPART].name).toBe('Rempart')
    expect(DefenseTranslations[DefenseCode.TURRET].name).toBe('Tourelle')
    expect(DefenseTranslations[DefenseCode.MINEFIELD].name).toBe('Champ de mines')
    expect(DefenseTranslations[DefenseCode.PLASMA_BATTERY].name).toBe('Batterie plasma')
    expect(DefenseTranslations[DefenseCode.SHIELD_GENERATOR].name).toBe('Générateur de bouclier')
  })

  it('names the Enceinte, keeps it out of the building list and the level cap', () => {
    expect(BuildingTranslations[BuildingCode.CITY_WALL].name).toBe('Enceinte')
    expect(buildingImageSrc(BuildingCode.CITY_WALL)).toMatch(/\.png$/)
    expect(isBuildingListed({ code: BuildingCode.CITY_WALL })).toBe(false)
    expect(isBuildingListed({ code: BuildingCode.CLONING_FACTORY })).toBe(true)
    expect(isLevelCappedBuilding(BuildingCode.CITY_WALL)).toBe(false)
    expect(isLevelCappedBuilding(BuildingCode.RESEARCH_LAB)).toBe(true)
  })

  it('files Fortification under Arsenal', () => {
    expect(technology_branch[TechnologyCode.FORTIFICATION]).toBe(TechnologyBranch.ARSENAL)
    expect(TechnologyTranslations[TechnologyCode.FORTIFICATION].name).toBe('Fortification')
  })

  it('labels the siege assault strategy', () => {
    expect(CombatStrategyLabels[CombatStrategy.SIEGE_ASSAULT]).toBe('Assaut de siège')
  })
})
