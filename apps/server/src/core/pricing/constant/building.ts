import { BuildingCode } from '#core/building/constant/code'
import { LevelCosts } from '#core/pricing/value/level'

export const ARCHITECTURE_REDUCTION_PER_LEVEL = 10

export const building_costs: Record<BuildingCode, LevelCosts> = {
  [BuildingCode.RECYCLING_PLANT]: {
    plastic: {
      base: 200,
      multiplier: 1.5
    },
    mushroom: {
      base: 100,
      multiplier: 1.3
    },
    duration: {
      base: 0.25,
      multiplier: 2
    }
  },
  [BuildingCode.PLASTIC_WAREHOUSE]: {
    plastic: {
      base: 250,
      multiplier: 2
    },
    mushroom: {
      base: 250,
      multiplier: 2
    },
    duration: {
      base: 15,
      multiplier: 1.7
    }
  },
  [BuildingCode.MUSHROOM_FARM]: {
    plastic: {
      base: 100,
      multiplier: 1.3
    },
    mushroom: {
      base: 200,
      multiplier: 1.5,
    },
    duration: {
      base: 0.35,
      multiplier: 2
    }
  },
  [BuildingCode.MUSHROOM_WAREHOUSE]: {
    plastic: {
      base: 250,
      multiplier: 2
    },
    mushroom: {
      base: 250,
      multiplier: 2
    },
    duration: {
      base: 15,
      multiplier: 1.7
    }
  },
  [BuildingCode.RESEARCH_LAB]: {
    plastic: {
      base: 6000,
      multiplier: 1.4
    },
    mushroom: {
      base: 6000,
      multiplier: 1.4,
    },
    duration: {
      base: 15,
      multiplier: 1.85
    }
  },
  [BuildingCode.CLONING_FACTORY]: {
    plastic: {
      base: 14000,
      multiplier: 1.3
    },
    mushroom: {
      base: 12000,
      multiplier: 1.2
    },
    duration: {
      base: 150,
      multiplier: 1.5
    }
  },
  [BuildingCode.SOLAR_PANEL]: {
    plastic: {
      base: 100,
      multiplier: 1.3
    },
    mushroom: {
      base: 200,
      multiplier: 1.5
    },
    duration: {
      base: 0.35,
      multiplier: 2
    }
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    plastic: {
      base: 4000,
      multiplier: 1.4
    },
    mushroom: {
      base: 4000,
      multiplier: 1.4
    },
    duration: {
      base: 20,
      multiplier: 1.8
    }
  }
}
