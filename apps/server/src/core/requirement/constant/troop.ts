import { BuildingCode } from '#core/building/constant/code'
import { RequirementValue } from '#core/requirement/value/requirement'
import { TroopCode } from '#core/troop/constant/code'

export const TroopRequirement: Record<TroopCode, RequirementValue> = {
  [TroopCode.EXPLORER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 1
      }
    ],
    technologies: []
  },
  [TroopCode.SETTLER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 9
      }
    ],
    technologies: []
  },
  [TroopCode.LIGHT_TRANSPORTER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 5
      }
    ],
    technologies: []
  },
  [TroopCode.FARMER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 3
      }
    ],
    technologies: []
  },
  [TroopCode.RECYCLER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 3
      }
    ],
    technologies: []
  },
  [TroopCode.SEEKER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 1
      }
    ],
    technologies: []
  },
  [TroopCode.ASSEMBLER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 9
      }
    ],
    technologies: []
  },
  [TroopCode.HAULER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 5
      }
    ],
    technologies: []
  },
  [TroopCode.HARVESTER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 3
      }
    ],
    technologies: []
  },
  [TroopCode.RECLAIMER]: {
    buildings: [
      {
        code: BuildingCode.CLONING_FACTORY,
        level: 3
      }
    ],
    technologies: []
  }
}
