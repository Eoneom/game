import { BuildingCode } from '#core/building/constant/code'
import { LevelCosts } from '#core/pricing/value/level'

export const ARCHITECTURE_REDUCTION_PER_LEVEL = 10

export const building_costs: Record<BuildingCode, LevelCosts> = {
  [BuildingCode.RECYCLING_PLANT]: {
    plastic: {
      base: 200,
      multiplier: 1.55
    },
    mushroom: {
      base: 100,
      multiplier: 1.4
    },
    duration: {
      base: 45,
      multiplier: 2.1
    }
  },
  [BuildingCode.PLASTIC_WAREHOUSE]: {
    plastic: {
      base: 250,
      multiplier: 2.1
    },
    mushroom: {
      base: 250,
      multiplier: 2.1
    },
    duration: {
      base: 45,
      multiplier: 1.85
    }
  },
  [BuildingCode.MUSHROOM_FARM]: {
    plastic: {
      base: 100,
      multiplier: 1.4
    },
    mushroom: {
      base: 200,
      multiplier: 1.55,
    },
    duration: {
      base: 45,
      multiplier: 2.1
    }
  },
  [BuildingCode.MUSHROOM_WAREHOUSE]: {
    plastic: {
      base: 250,
      multiplier: 2.1
    },
    mushroom: {
      base: 250,
      multiplier: 2.1
    },
    duration: {
      base: 45,
      multiplier: 1.85
    }
  },
  [BuildingCode.RESEARCH_LAB]: {
    plastic: {
      base: 6000,
      multiplier: 1.45
    },
    mushroom: {
      base: 6000,
      multiplier: 1.45,
    },
    duration: {
      base: 15,
      multiplier: 1.95
    }
  },
  [BuildingCode.CLONING_FACTORY]: {
    plastic: {
      base: 14000,
      multiplier: 1.35
    },
    mushroom: {
      base: 12000,
      multiplier: 1.25
    },
    duration: {
      base: 150,
      multiplier: 1.65
    }
  },
  [BuildingCode.SOLAR_PANEL]: {
    plastic: {
      base: 100,
      multiplier: 1.4
    },
    mushroom: {
      base: 200,
      multiplier: 1.55
    },
    duration: {
      base: 45,
      multiplier: 2.1
    }
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    plastic: {
      base: 4000,
      multiplier: 1.45
    },
    mushroom: {
      base: 4000,
      multiplier: 1.45
    },
    duration: {
      base: 20,
      multiplier: 1.95
    }
  }
}
