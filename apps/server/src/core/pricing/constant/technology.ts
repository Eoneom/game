import { LevelCosts } from '#core/pricing/value/level'
import { TechnologyCode } from '#core/technology/constant/code'

export const RESEARCH_LABEL_REDUCTION_PER_LEVEL = 10

export const technology_costs: Record<TechnologyCode, LevelCosts> = {
  [TechnologyCode.ARCHITECTURE]: {
    plastic: {
      base: 2000,
      multiplier: 2
    },
    mushroom: {
      base: 2000,
      multiplier: 2
    },
    duration: {
      base: 30,
      multiplier: 2
    }
  },
  [TechnologyCode.REPLICATION_CATALYST]: {
    mushroom: {
      base: 10000,
      multiplier: 1.4
    },
    plastic: {
      base: 20000,
      multiplier: 1.4
    },
    duration: {
      base: 150,
      multiplier: 2.2
    }
  },
  [TechnologyCode.OUTPOST_LOGISTICS]: {
    plastic: {
      base: 5000,
      multiplier: 1.6
    },
    mushroom: {
      base: 4000,
      multiplier: 1.6
    },
    duration: {
      base: 90,
      multiplier: 2
    }
  },
  [TechnologyCode.OUTPOST_EXPANSION]: {
    plastic: {
      base: 5000,
      multiplier: 1.6
    },
    mushroom: {
      base: 4000,
      multiplier: 1.6
    },
    duration: {
      base: 90,
      multiplier: 2
    }
  },
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: {
    plastic: {
      base: 7500,
      multiplier: 1.6
    },
    mushroom: {
      base: 6000,
      multiplier: 1.6
    },
    duration: {
      base: 120,
      multiplier: 2
    }
  }
}
