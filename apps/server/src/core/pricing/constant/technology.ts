import { LevelCosts } from '#core/pricing/value/level'
import { TechnologyCode } from '#core/technology/constant/code'

export const RESEARCH_LABEL_REDUCTION_PER_LEVEL = 10

export const technology_costs: Record<TechnologyCode, LevelCosts> = {
  [TechnologyCode.ARCHITECTURE]: {
    plastic: {
      base: 4000,
      multiplier: 2
    },
    mushroom: {
      base: 4000,
      multiplier: 2
    },
    duration: {
      base: 60,
      multiplier: 2
    }
  },
  [TechnologyCode.REPLICATION_CATALYST]: {
    mushroom: {
      base: 20000,
      multiplier: 1.4
    },
    plastic: {
      base: 40000,
      multiplier: 1.4
    },
    duration: {
      base: 300,
      multiplier: 2.2
    }
  },
  [TechnologyCode.OUTPOST_LOGISTICS]: {
    plastic: {
      base: 10000,
      multiplier: 1.6
    },
    mushroom: {
      base: 8000,
      multiplier: 1.6
    },
    duration: {
      base: 180,
      multiplier: 2
    }
  }
}
