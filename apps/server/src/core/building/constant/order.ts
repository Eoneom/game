import { BuildingCode } from '#core/building/constant/code'

export const building_order: Record<BuildingCode, number> = {
  [BuildingCode.RECYCLING_PLANT]: 1,
  [BuildingCode.PLASTIC_WAREHOUSE]: 2,
  [BuildingCode.MUSHROOM_FARM]: 3,
  [BuildingCode.MUSHROOM_WAREHOUSE]: 4,
  [BuildingCode.RESEARCH_LAB]: 5,
  [BuildingCode.CLONING_FACTORY]: 6,
  [BuildingCode.SOLAR_PANEL]: 7
}
