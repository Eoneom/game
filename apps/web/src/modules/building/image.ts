import { BuildingCode } from '@eoneom/api-client'

/**
 * Slice 028 buildings have no dedicated artwork yet: reuse a related existing picture
 * until it lands (follow-up tracked in specs/028-command-center-shelter/spec.md).
 */
const placeholder_image_src: Partial<Record<BuildingCode, string>> = {
  [BuildingCode.COMMAND_CENTER]: '/buildings/research_lab.png',
  [BuildingCode.UNDERGROUND_SHELTER]: '/buildings/mushroom_warehouse.png',
}

export const buildingImageSrc = (code: BuildingCode): string => {
  return placeholder_image_src[code] ?? `/buildings/${code}.png`
}
