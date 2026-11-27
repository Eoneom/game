import { BuildingCode } from '@eoneom/api-client'

export enum BuildingFamily {
  PRODUCTION = 'production',
  STORAGE = 'storage',
  MILITARY = 'military',
  SPECIAL = 'special',
}

/** Display order of families in the building catalogue (slice 043). */
const building_family_order: BuildingFamily[] = [
  BuildingFamily.PRODUCTION,
  BuildingFamily.STORAGE,
  BuildingFamily.MILITARY,
  BuildingFamily.SPECIAL,
]

/** Every listed building; the Enceinte lives in the Défense tab (`isBuildingListed`). */
export const building_family: Record<Exclude<BuildingCode, BuildingCode.CITY_WALL>, BuildingFamily> = {
  [BuildingCode.RECYCLING_PLANT]: BuildingFamily.PRODUCTION,
  [BuildingCode.MUSHROOM_FARM]: BuildingFamily.PRODUCTION,
  [BuildingCode.SOLAR_PANEL]: BuildingFamily.PRODUCTION,
  [BuildingCode.CENTRAL_INDUCTOR]: BuildingFamily.PRODUCTION,
  [BuildingCode.WATER_PURIFIER]: BuildingFamily.PRODUCTION,
  [BuildingCode.PLASTIC_WAREHOUSE]: BuildingFamily.STORAGE,
  [BuildingCode.MUSHROOM_WAREHOUSE]: BuildingFamily.STORAGE,
  [BuildingCode.UNDERGROUND_SHELTER]: BuildingFamily.STORAGE,
  [BuildingCode.CLONING_FACTORY]: BuildingFamily.MILITARY,
  [BuildingCode.COMMAND_CENTER]: BuildingFamily.MILITARY,
  [BuildingCode.RESEARCH_LAB]: BuildingFamily.SPECIAL,
  [BuildingCode.TRADING_POST]: BuildingFamily.SPECIAL,
}

const buildingFamilyOf = (code: BuildingCode): BuildingFamily | undefined =>
  code === BuildingCode.CITY_WALL ? undefined : building_family[code]

/** Groups items by family in display order, keeping input order within a family; empty families and unlisted buildings are dropped. */
export const groupByBuildingFamily = <T extends { code: BuildingCode }>(
  items: T[]
): Array<{ family: BuildingFamily, items: T[] }> =>
  building_family_order
    .map(family => ({
      family,
      items: items.filter(item => buildingFamilyOf(item.code) === family),
    }))
    .filter(group => group.items.length > 0)
