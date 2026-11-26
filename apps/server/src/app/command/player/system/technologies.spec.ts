import {
  SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY,
  sortTechnologiesForSystemResearch,
  systemTechnologyResearchPriority,
} from './technologies'
import {
  getSystemAiProfile, SystemAiProfileId
} from '#core/player/system/ai-profile'
import { TechnologyCode } from '#core/technology/constant/code'
import assert from 'assert'

describe('sortTechnologiesForSystemResearch', () => {
  it('orders by system priority then lower level', () => {
    const sorted = sortTechnologiesForSystemResearch({
      all_technologies: [],
      research_queue: [],
      technologies: [
        {
          code: TechnologyCode.OUTPOST_LOGISTICS,
          level: 0,
        },
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 2,
        },
        {
          code: TechnologyCode.REPLICATION_CATALYST,
          level: 3,
        },
        {
          code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
          level: 0,
        },
        {
          code: TechnologyCode.OUTPOST_EXPANSION,
          level: 0,
        },
      ],
    })

    assert.deepStrictEqual(sorted.map(t => t.code), [
      TechnologyCode.ARCHITECTURE,
      TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      TechnologyCode.REPLICATION_CATALYST,
      TechnologyCode.OUTPOST_LOGISTICS,
      TechnologyCode.OUTPOST_EXPANSION,
    ])
  })

  it('excludes technology codes with pending research or queue entries', () => {
    const sorted = sortTechnologiesForSystemResearch({
      all_technologies: [
        {
          id: 't1',
          code: TechnologyCode.ARCHITECTURE,
          level: 0,
          research_at: 1000,
          research_started_at: 0,
        },
      ],
      research_queue: [
        {
          id: 'q1',
          technology_code: TechnologyCode.REPLICATION_CATALYST,
        },
      ],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 0,
        },
        {
          code: TechnologyCode.REPLICATION_CATALYST,
          level: 0,
        },
        {
          code: TechnologyCode.OUTPOST_LOGISTICS,
          level: 0,
        },
      ],
    })

    assert.deepStrictEqual(sorted.map(t => t.code), [ TechnologyCode.OUTPOST_LOGISTICS ])
  })

  it('appends Économie then Arsenal after the foundation technologies', () => {
    assert.deepStrictEqual(SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY, [
      TechnologyCode.ARCHITECTURE,
      TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      TechnologyCode.REPLICATION_CATALYST,
      TechnologyCode.OUTPOST_LOGISTICS,
      TechnologyCode.OUTPOST_EXPANSION,
      TechnologyCode.AGRONOMY,
      TechnologyCode.ADVANCED_RECYCLING,
      TechnologyCode.STORAGE_COMPRESSION,
      TechnologyCode.PLASMA_CONTAINMENT,
      TechnologyCode.BALLISTIC_ALLOYS,
      TechnologyCode.ORGANIC_PLATING,
      TechnologyCode.TACTICAL_PROPULSION,
    ])
    assert.deepStrictEqual(
      [ ...SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY ].sort(),
      Object.values(TechnologyCode).sort()
    )
  })

  it('puts Arsenal ahead of Économie for the Ash Liturgy aggressive profile', () => {
    const ash_liturgy = getSystemAiProfile(SystemAiProfileId.ASH_LITURGY_AGGRESSIVE)
    const priority = systemTechnologyResearchPriority({ arsenal_first: ash_liturgy.research_arsenal_first })
    const sorted = sortTechnologiesForSystemResearch({
      all_technologies: [],
      research_queue: [],
      priority,
      technologies: [
        {
          code: TechnologyCode.AGRONOMY,
          level: 0
        },
        {
          code: TechnologyCode.TACTICAL_PROPULSION,
          level: 0
        },
        {
          code: TechnologyCode.PLASMA_CONTAINMENT,
          level: 0
        },
        {
          code: TechnologyCode.BALLISTIC_ALLOYS,
          level: 0
        },
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 0
        },
        {
          code: TechnologyCode.ORGANIC_PLATING,
          level: 0
        },
      ],
    })

    assert.deepStrictEqual(sorted.map(t => t.code), [
      TechnologyCode.ARCHITECTURE,
      TechnologyCode.BALLISTIC_ALLOYS,
      TechnologyCode.ORGANIC_PLATING,
      TechnologyCode.TACTICAL_PROPULSION,
      TechnologyCode.AGRONOMY,
      TechnologyCode.PLASMA_CONTAINMENT,
    ])
    const default_priority = systemTechnologyResearchPriority({ arsenal_first: getSystemAiProfile(SystemAiProfileId.SINGULARITY_DEFAULT).research_arsenal_first })
    assert.deepStrictEqual(default_priority, SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY)
  })
})
