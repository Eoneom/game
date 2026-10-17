import { sortTechnologiesForSystemResearch } from './technologies'
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
      ],
    })

    assert.deepStrictEqual(sorted.map(t => t.code), [
      TechnologyCode.ARCHITECTURE,
      TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      TechnologyCode.REPLICATION_CATALYST,
      TechnologyCode.OUTPOST_LOGISTICS,
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
})
