import { BuildingCode } from '#core/building/constant/code'
import { LevelCosts } from '#core/pricing/value/level'

export const ARCHITECTURE_REDUCTION_PER_LEVEL = 10

export const building_costs: Record<BuildingCode, LevelCosts> = {
  [BuildingCode.RECYCLING_PLANT]: {
    plastic: {
      base: 100,
      multiplier: 1.55
    },
    mushroom: {
      base: 50,
      multiplier: 1.4
    },
    duration: {
      base: 12,
      multiplier: 1.6
    }
  },
  [BuildingCode.PLASTIC_WAREHOUSE]: {
    plastic: {
      base: 125,
      multiplier: 2.1
    },
    mushroom: {
      base: 125,
      multiplier: 2.1
    },
    duration: {
      base: 23,
      multiplier: 1.85
    }
  },
  [BuildingCode.MUSHROOM_FARM]: {
    plastic: {
      base: 50,
      multiplier: 1.4
    },
    mushroom: {
      base: 100,
      multiplier: 1.55,
    },
    duration: {
      base: 12,
      multiplier: 1.6
    }
  },
  [BuildingCode.MUSHROOM_WAREHOUSE]: {
    plastic: {
      base: 125,
      multiplier: 2.1
    },
    mushroom: {
      base: 125,
      multiplier: 2.1
    },
    duration: {
      base: 23,
      multiplier: 1.85
    }
  },
  [BuildingCode.RESEARCH_LAB]: {
    plastic: {
      base: 3000,
      multiplier: 1.45
    },
    mushroom: {
      base: 3000,
      multiplier: 1.45,
    },
    duration: {
      base: 8,
      multiplier: 1.95
    }
  },
  [BuildingCode.CLONING_FACTORY]: {
    plastic: {
      base: 7000,
      multiplier: 1.35
    },
    mushroom: {
      base: 6000,
      multiplier: 1.25
    },
    duration: {
      base: 75,
      multiplier: 1.65
    }
  },
  [BuildingCode.SOLAR_PANEL]: {
    plastic: {
      base: 50,
      multiplier: 1.4
    },
    mushroom: {
      base: 100,
      multiplier: 1.55
    },
    duration: {
      base: 23,
      multiplier: 2.1
    }
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    plastic: {
      base: 2000,
      multiplier: 1.45
    },
    mushroom: {
      base: 2000,
      multiplier: 1.45
    },
    duration: {
      base: 10,
      multiplier: 1.95
    }
  },
  [BuildingCode.COMMAND_CENTER]: {
    plastic: {
      base: 2000,
      multiplier: 1.8
    },
    mushroom: {
      base: 1500,
      multiplier: 1.8
    },
    duration: {
      base: 180,
      multiplier: 1.7
    }
  },
  [BuildingCode.UNDERGROUND_SHELTER]: {
    plastic: {
      base: 600,
      multiplier: 1.7
    },
    mushroom: {
      base: 600,
      multiplier: 1.7
    },
    duration: {
      base: 60,
      multiplier: 1.6
    }
  },
  [BuildingCode.CITY_WALL]: {
    plastic: {
      base: 1500,
      multiplier: 1.7
    },
    mushroom: {
      base: 1000,
      multiplier: 1.7
    },
    duration: {
      base: 150,
      multiplier: 1.7
    }
  },
  [BuildingCode.WATER_PURIFIER]: {
    plastic: {
      base: 2500,
      multiplier: 1.7
    },
    mushroom: {
      base: 2000,
      multiplier: 1.7
    },
    duration: {
      base: 200,
      multiplier: 1.7
    }
  },
  [BuildingCode.TRADING_POST]: {
    plastic: {
      base: 1500,
      multiplier: 1.8
    },
    mushroom: {
      base: 1500,
      multiplier: 1.8
    },
    duration: {
      base: 150,
      multiplier: 1.8
    }
  }
}
