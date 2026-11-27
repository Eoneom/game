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
  },
  [TechnologyCode.BALLISTIC_ALLOYS]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 5
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 1
      }
    ],
    technologies: []
  },
  [TechnologyCode.ORGANIC_PLATING]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 5
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 1
      }
    ],
    technologies: []
  },
  [TechnologyCode.TACTICAL_PROPULSION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 6
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 2
      }
    ],
    technologies: []
  },
  [TechnologyCode.ADVANCED_RECYCLING]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 3
      }
    ],
    technologies: []
  },
  [TechnologyCode.AGRONOMY]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 3
      }
    ],
    technologies: []
  },
  [TechnologyCode.STORAGE_COMPRESSION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 4
      }
    ],
    technologies: [
      {
        code: TechnologyCode.ARCHITECTURE,
        level: 3
      }
    ]
  },
  [TechnologyCode.PLASMA_CONTAINMENT]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 5
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 3
      }
    ],
    technologies: []
  },
  [TechnologyCode.FORTIFICATION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 5
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 1
      }
    ],
    technologies: []
  },
  [TechnologyCode.ESPIONAGE]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 3
      }
    ],
    technologies: []
  },
  [TechnologyCode.DETECTION]: {
    buildings: [
      {
        code: BuildingCode.RESEARCH_LAB,
        level: 3
      }
    ],
    technologies: []
  }
}
