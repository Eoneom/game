import { describe, expect, it } from 'vitest'
import { TechnologyCode } from '@eoneom/api-client'

import {
  groupByTechnologyBranch,
  technology_branch,
  TechnologyBranch
} from '#technology/branch'
import { technologyImageSrc } from '#technology/image'
import {
  TechnologyBranchLabels,
  TechnologyTranslations
} from '#technology/translations'

describe('technology_branch', () => {
  it('assigns Arsenal and Économie codes to their branch', () => {
    expect(technology_branch[TechnologyCode.ARCHITECTURE]).toBe(TechnologyBranch.FOUNDATIONS)
    expect(technology_branch[TechnologyCode.BALLISTIC_ALLOYS]).toBe(TechnologyBranch.ARSENAL)
    expect(technology_branch[TechnologyCode.TACTICAL_PROPULSION]).toBe(TechnologyBranch.ARSENAL)
    expect(technology_branch[TechnologyCode.STORAGE_COMPRESSION]).toBe(TechnologyBranch.ECONOMY)
    expect(technology_branch[TechnologyCode.PLASMA_CONTAINMENT]).toBe(TechnologyBranch.ECONOMY)
    expect(technology_branch[TechnologyCode.ESPIONAGE]).toBe(TechnologyBranch.INTELLIGENCE)
    expect(technology_branch[TechnologyCode.DETECTION]).toBe(TechnologyBranch.INTELLIGENCE)
  })

  it('has French labels for every branch', () => {
    expect(TechnologyBranchLabels[TechnologyBranch.FOUNDATIONS]).toBe('Fondations')
    expect(TechnologyBranchLabels[TechnologyBranch.ARSENAL]).toBe('Arsenal')
    expect(TechnologyBranchLabels[TechnologyBranch.ECONOMY]).toBe('Économie')
    expect(TechnologyBranchLabels[TechnologyBranch.INTELLIGENCE]).toBe('Renseignement')
  })
})

describe('groupByTechnologyBranch', () => {
  it('groups in branch order and keeps the server order within a branch', () => {
    const groups = groupByTechnologyBranch([
      { code: TechnologyCode.AGRONOMY },
      { code: TechnologyCode.ARCHITECTURE },
      { code: TechnologyCode.ORGANIC_PLATING },
      { code: TechnologyCode.ADVANCED_RECYCLING },
      { code: TechnologyCode.BALLISTIC_ALLOYS },
    ])

    expect(groups.map(group => group.branch)).toEqual([
      TechnologyBranch.FOUNDATIONS,
      TechnologyBranch.ARSENAL,
      TechnologyBranch.ECONOMY,
    ])
    expect(groups[1].items.map(item => item.code)).toEqual([
      TechnologyCode.ORGANIC_PLATING,
      TechnologyCode.BALLISTIC_ALLOYS,
    ])
    expect(groups[2].items.map(item => item.code)).toEqual([
      TechnologyCode.AGRONOMY,
      TechnologyCode.ADVANCED_RECYCLING,
    ])
  })

  it('drops empty branches', () => {
    expect(groupByTechnologyBranch([{ code: TechnologyCode.AGRONOMY }]).map(group => group.branch))
      .toEqual([TechnologyBranch.ECONOMY])
  })
})

describe('technology catalogue', () => {
  it('has a French name and an image for every code', () => {
    for (const code of Object.values(TechnologyCode)) {
      expect(TechnologyTranslations[code].name).toBeTruthy()
      expect(technologyImageSrc(code)).toMatch(/\.png$/)
    }
    expect(TechnologyTranslations[TechnologyCode.STORAGE_COMPRESSION].name).toBe('Compression')
  })
})
