import { BuildingCode } from '#core/building/constant/code'
import { RequirementValue } from '#core/requirement/value/requirement'
import { TechnologyCode } from '#core/technology/constant/code'

export const TechnologyRequirement: Record<TechnologyCode, RequirementValue> = {
  [TechnologyCode.ARCHITECTURE]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 1
      }
    ],
    technologies: []
  },
  [TechnologyCode.REPLICATION_CATALYST]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 5
      }
    ],
    technologies: []
  },
  [TechnologyCode.OUTPOST_LOGISTICS]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 3
      }
    ],
    technologies: []
  },
  [TechnologyCode.OUTPOST_EXPANSION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 4
      }
    ],
    technologies: [
      {
        code: TechnologyCode.OUTPOST_LOGISTICS,
        level: 1
      }
    ]
  },
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 6
      }
    ],
    technologies: []
  }
}
