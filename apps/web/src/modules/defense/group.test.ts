import { describe, expect, it } from 'vitest'
import { DefenseCode, defense_faction } from '@eoneom/api-client'

import { DefenseGroup, DefenseGroupLabels, groupByDefenseOwner } from '#defense/group'

describe('groupByDefenseOwner (043)', () => {
  it('splits common and faction defenses, keeping the catalogue order', () => {
    const groups = groupByDefenseOwner([
      { code: DefenseCode.RAMPART },
      { code: DefenseCode.FIELD_ARTILLERY },
      { code: DefenseCode.TURRET },
      { code: DefenseCode.BARBED_WIRE },
    ])

    expect(groups).toEqual([
      { group: DefenseGroup.COMMON, items: [ { code: DefenseCode.RAMPART }, { code: DefenseCode.TURRET } ] },
      { group: DefenseGroup.FACTION, items: [ { code: DefenseCode.FIELD_ARTILLERY }, { code: DefenseCode.BARBED_WIRE } ] },
    ])
  })

  it('drops an empty group', () => {
    expect(groupByDefenseOwner([ { code: DefenseCode.MINEFIELD } ]).map(group => group.group)).toEqual([ DefenseGroup.COMMON ])
  })

  it('reads the faction defenses from the api-client constant', () => {
    expect(defense_faction[DefenseCode.HOLO_DECOY]).toBeDefined()
    expect(defense_faction[DefenseCode.SHIELD_GENERATOR]).toBeUndefined()
    expect(DefenseGroupLabels[DefenseGroup.CITY_WALL]).toBe('Enceinte')
    expect(DefenseGroupLabels[DefenseGroup.COMMON]).toBe('Défenses communes')
    expect(DefenseGroupLabels[DefenseGroup.FACTION]).toBe('Défenses de faction')
  })
})
