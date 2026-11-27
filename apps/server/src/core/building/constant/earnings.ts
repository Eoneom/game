import { BuildingCode } from '#core/building/constant/code'

export type ProductionBuildingCode =
  | BuildingCode.RECYCLING_PLANT
  | BuildingCode.MUSHROOM_FARM
  | BuildingCode.CENTRAL_INDUCTOR
  | BuildingCode.WATER_PURIFIER

export interface Earnings {
  base: number
  multiplier: number
}

export const building_earnings: Record<
  ProductionBuildingCode,
  Earnings
> = {
  [BuildingCode.RECYCLING_PLANT]: {
    base: 3.6,
    multiplier: 1.15
  },
  [BuildingCode.MUSHROOM_FARM]: {
    base: 3.0,
    multiplier: 1.20
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    base: 0.1,
    multiplier: 1.15
  },
  [BuildingCode.WATER_PURIFIER]: {
    base: 0.05,
    multiplier: 1.15
  }
}
