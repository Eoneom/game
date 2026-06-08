import { BuildingCode } from '#core/building/constant/code'

export interface Energy {
  base: number
  multiplier: number
}

export const building_energy: Record<BuildingCode.SOLAR_PANEL, Energy> = {
  [BuildingCode.SOLAR_PANEL]: {
    base: 10,
    multiplier: 1.5
  }
}

export type ConsumingBuildingCode =
  | BuildingCode.RECYCLING_PLANT
  | BuildingCode.MUSHROOM_FARM
  | BuildingCode.CENTRAL_INDUCTOR
  | BuildingCode.RESEARCH_LAB
  | BuildingCode.CLONING_FACTORY

export const building_energy_consumption: Record<ConsumingBuildingCode, Energy> = {
  [BuildingCode.RECYCLING_PLANT]: {
    base: 20,
    multiplier: 1.15
  },
  [BuildingCode.MUSHROOM_FARM]: {
    base: 20,
    multiplier: 1.20
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    base: 180,
    multiplier: 1.25
  },
  [BuildingCode.RESEARCH_LAB]: {
    base: 60,
    multiplier: 1.30
  },
  [BuildingCode.CLONING_FACTORY]: {
    base: 100,
    multiplier: 1.25
  }
}

export const SOLAR_EFFICIENCY_MULTIPLIER_PER_LEVEL = 1.15
