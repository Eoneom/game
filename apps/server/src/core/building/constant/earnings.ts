import { BuildingCode } from '#core/building/constant/code'

export interface Earnings {
  base: number
  multiplier: number
}

export const building_earnings: Record<
  BuildingCode.RECYCLING_PLANT | BuildingCode.MUSHROOM_FARM | BuildingCode.CENTRAL_INDUCTOR,
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
  }
}
