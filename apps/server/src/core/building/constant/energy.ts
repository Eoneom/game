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

export const SOLAR_EFFICIENCY_MULTIPLIER_PER_LEVEL = 1.15
