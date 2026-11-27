import { describe, expect, it } from 'vitest'
import { BuildingCode, TechnologyCode } from '@eoneom/api-client'

import { listUnmetRequirements, unmetRequirementName } from '#requirement/hook'

describe('listUnmetRequirements (043)', () => {
  const requirement = {
    buildings: [
      { code: BuildingCode.RESEARCH_LAB, level: 3 },
      { code: BuildingCode.CLONING_FACTORY, level: 1 },
    ],
    technologies: [ { code: TechnologyCode.ARCHITECTURE, level: 2 } ],
  }

  it('lists the unmet entries, buildings first, with the current level', () => {
    const unmet = listUnmetRequirements({
      requirement,
      buildings: [ { code: BuildingCode.RESEARCH_LAB, level: 2 }, { code: BuildingCode.CLONING_FACTORY, level: 1 } ],
      technologies: [],
    })

    expect(unmet).toEqual([
      { kind: 'building', code: BuildingCode.RESEARCH_LAB, level: 3, current: 2 },
      { kind: 'technology', code: TechnologyCode.ARCHITECTURE, level: 2, current: 0 },
    ])
    expect(unmet.map(unmetRequirementName)).toEqual([ 'Laboratoire de recherche', 'Architecture' ])
  })

  it('returns nothing when every entry is met', () => {
    expect(listUnmetRequirements({
      requirement,
      buildings: [ { code: BuildingCode.RESEARCH_LAB, level: 5 }, { code: BuildingCode.CLONING_FACTORY, level: 1 } ],
      technologies: [ { code: TechnologyCode.ARCHITECTURE, level: 2 } ],
    })).toEqual([])
  })
})
