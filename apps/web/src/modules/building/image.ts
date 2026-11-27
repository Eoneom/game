import { BuildingCode } from '@eoneom/api-client'

/**
 * Slice 028 / 029 / 035 buildings have no dedicated artwork yet: reuse a related existing picture
 * until it lands (follow-ups tracked in specs/028-command-center-shelter/spec.md,
 * specs/029-city-defenses/spec.md and specs/035-faction-exchange/spec.md).
 */
const placeholder_image_src: Partial<Record<BuildingCode, string>> = {
  [BuildingCode.COMMAND_CENTER]: '/buildings/research_lab.png',
  [BuildingCode.UNDERGROUND_SHELTER]: '/buildings/mushroom_warehouse.png',
  [BuildingCode.CITY_WALL]: '/buildings/plastic_warehouse.png',
  [BuildingCode.WATER_PURIFIER]: '/buildings/recycling_plant.png',
  [BuildingCode.TRADING_POST]: '/buildings/plastic_warehouse.png',
}

export const buildingImageSrc = (code: BuildingCode): string => {
  return placeholder_image_src[code] ?? `/buildings/${code}.png`
}
