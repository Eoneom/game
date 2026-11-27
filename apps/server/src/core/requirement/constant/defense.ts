import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { RequirementValue } from '#core/requirement/value/requirement'
import { TechnologyCode } from '#core/technology/constant/code'

export const DefenseRequirement: Record<DefenseCode, RequirementValue> = {
  [DefenseCode.RAMPART]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 1
      }
    ],
    technologies: []
  },
  [DefenseCode.TURRET]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 2
      }
    ],
    technologies: [
      {
        code: TechnologyCode.FORTIFICATION,
        level: 1
      }
    ]
  },
  [DefenseCode.MINEFIELD]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 2
      }
    ],
    technologies: []
  },
  [DefenseCode.SHIELD_GENERATOR]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 4
      }
    ],
    technologies: [
      {
        code: TechnologyCode.FORTIFICATION,
        level: 2
      }
    ]
  },
  [DefenseCode.PLASMA_BATTERY]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 5
      },
      {
        code: BuildingCode.CENTRAL_INDUCTOR,
        level: 1
      }
    ],
    technologies: [
      {
        code: TechnologyCode.FORTIFICATION,
        level: 3
      }
    ]
  },
  [DefenseCode.MYCELIUM_WALL]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 1
      }
    ],
    technologies: []
  },
  [DefenseCode.SPORE_CLOUD]: {
    buildings: [
      {
        code: BuildingCode.CITY_WALL,
        level: 2
      }
    ],
    technologies: [
      {
        code: TechnologyCode.FORTIFICATION,
        level: 1
      }
    ]
  },
}
