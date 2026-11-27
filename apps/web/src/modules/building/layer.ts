import { BuildingCode } from '@eoneom/api-client'

/** The Enceinte has its own layer (Défense tab) and is outside the city's building level cap (slice 029). */
export const isLevelCappedBuilding = (code: BuildingCode): boolean => code !== BuildingCode.CITY_WALL

/** Buildings shown in the building list; the Enceinte is shown in the Défense tab instead. */
export const isBuildingListed = ({ code }: { code: BuildingCode }): boolean => code !== BuildingCode.CITY_WALL
