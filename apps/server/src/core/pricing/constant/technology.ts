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
  },
  [TechnologyCode.BALLISTIC_ALLOYS]: {
    plastic: {
      base: 8000,
      multiplier: 1.7
    },
    mushroom: {
      base: 6000,
      multiplier: 1.7
    },
    plasma: {
      base: 500,
      multiplier: 1.7
    },
    duration: {
      base: 180,
      multiplier: 2
    }
  },
  [TechnologyCode.ORGANIC_PLATING]: {
    plastic: {
      base: 6000,
      multiplier: 1.7
    },
    mushroom: {
      base: 8000,
      multiplier: 1.7
    },
    plasma: {
      base: 500,
      multiplier: 1.7
    },
    duration: {
      base: 180,
      multiplier: 2
    }
  },
  [TechnologyCode.TACTICAL_PROPULSION]: {
    plastic: {
      base: 10000,
      multiplier: 1.8
    },
    mushroom: {
      base: 8000,
      multiplier: 1.8
    },
    plasma: {
      base: 800,
      multiplier: 1.8
    },
    duration: {
      base: 240,
      multiplier: 2
    }
  },
  [TechnologyCode.ADVANCED_RECYCLING]: {
    plastic: {
      base: 4000,
      multiplier: 1.6
    },
    mushroom: {
      base: 3000,
      multiplier: 1.6
    },
    duration: {
      base: 90,
      multiplier: 2
    }
  },
  [TechnologyCode.AGRONOMY]: {
    plastic: {
      base: 3000,
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
  [TechnologyCode.STORAGE_COMPRESSION]: {
    plastic: {
      base: 5000,
      multiplier: 1.7
    },
    mushroom: {
      base: 5000,
      multiplier: 1.7
    },
    duration: {
      base: 120,
      multiplier: 2
    }
  },
  [TechnologyCode.PLASMA_CONTAINMENT]: {
    plastic: {
      base: 8000,
      multiplier: 1.6
    },
    mushroom: {
      base: 8000,
      multiplier: 1.6
    },
    duration: {
      base: 150,
      multiplier: 2
    }
  },
  [TechnologyCode.FORTIFICATION]: {
    plastic: {
      base: 7000,
      multiplier: 1.7
    },
    mushroom: {
      base: 7000,
      multiplier: 1.7
    },
    plasma: {
      base: 400,
      multiplier: 1.7
    },
    duration: {
      base: 180,
      multiplier: 2
    }
  }
}
