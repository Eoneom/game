import { describe, expect, it } from 'vitest'
import { BuildingCode } from '@eoneom/api-client'

import { building_family, BuildingFamily, groupByBuildingFamily } from '#building/family'
import { isBuildingListed } from '#building/layer'
import { BuildingFamilyLabels } from '#building/translations'

describe('building_family (043)', () => {
  it('gives every listed building a family and leaves the Enceinte to the Défense tab', () => {
    const listed = Object.values(BuildingCode).filter(code => isBuildingListed({ code }))
    expect(Object.keys(building_family).sort()).toEqual([ ...listed ].sort())
    expect(BuildingCode.CITY_WALL in building_family).toBe(false)
  })

  it('files buildings as decided', () => {
    expect(building_family[BuildingCode.SOLAR_PANEL]).toBe(BuildingFamily.PRODUCTION)
    expect(building_family[BuildingCode.WATER_PURIFIER]).toBe(BuildingFamily.PRODUCTION)
    expect(building_family[BuildingCode.UNDERGROUND_SHELTER]).toBe(BuildingFamily.STORAGE)
    expect(building_family[BuildingCode.COMMAND_CENTER]).toBe(BuildingFamily.MILITARY)
    expect(building_family[BuildingCode.RESEARCH_LAB]).toBe(BuildingFamily.SPECIAL)
    expect(building_family[BuildingCode.TRADING_POST]).toBe(BuildingFamily.SPECIAL)
  })

  it('has French labels for every family', () => {
    expect(BuildingFamilyLabels).toEqual({
      [BuildingFamily.PRODUCTION]: 'Production',
      [BuildingFamily.STORAGE]: 'Stockage',
      [BuildingFamily.MILITARY]: 'Militaire',
      [BuildingFamily.SPECIAL]: 'Spécial',
    })
  })
})

describe('groupByBuildingFamily', () => {
  it('groups in family order, keeps the server order and drops empty families and the Enceinte', () => {
    const groups = groupByBuildingFamily([
      { code: BuildingCode.RESEARCH_LAB },
      { code: BuildingCode.MUSHROOM_FARM },
      { code: BuildingCode.CITY_WALL },
      { code: BuildingCode.RECYCLING_PLANT },
      { code: BuildingCode.TRADING_POST },
    ])

    expect(groups.map(group => group.family)).toEqual([ BuildingFamily.PRODUCTION, BuildingFamily.SPECIAL ])
    expect(groups[0].items.map(item => item.code)).toEqual([ BuildingCode.MUSHROOM_FARM, BuildingCode.RECYCLING_PLANT ])
    expect(groups[1].items.map(item => item.code)).toEqual([ BuildingCode.RESEARCH_LAB, BuildingCode.TRADING_POST ])
  })
})
