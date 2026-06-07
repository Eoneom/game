import { BuildingCode } from '#core/building/constant/code'

export const isWarehouseBuildingCode = (code: string): code is BuildingCode.MUSHROOM_WAREHOUSE | BuildingCode.PLASTIC_WAREHOUSE => code === BuildingCode.MUSHROOM_WAREHOUSE || code === BuildingCode.PLASTIC_WAREHOUSE
export const isProductionBuildingCode = (code: string): code is BuildingCode.RECYCLING_PLANT | BuildingCode.MUSHROOM_FARM => code === BuildingCode.RECYCLING_PLANT || code === BuildingCode.MUSHROOM_FARM
export const isEnergyBuildingCode = (code: string): code is BuildingCode.SOLAR_PANEL => code === BuildingCode.SOLAR_PANEL
export const isConsumingBuildingCode = (code: string): code is BuildingCode.RECYCLING_PLANT | BuildingCode.MUSHROOM_FARM | BuildingCode.RESEARCH_LAB | BuildingCode.CLONING_FACTORY =>
  code === BuildingCode.RECYCLING_PLANT ||
  code === BuildingCode.MUSHROOM_FARM ||
  code === BuildingCode.RESEARCH_LAB ||
  code === BuildingCode.CLONING_FACTORY
export const isNonProductionConsumingBuildingCode = (code: string): code is BuildingCode.RESEARCH_LAB | BuildingCode.CLONING_FACTORY =>
  code === BuildingCode.RESEARCH_LAB || code === BuildingCode.CLONING_FACTORY
