import { TechnologyCode } from '@eoneom/api-client'

/**
 * Slice 027 / 029 technologies have no dedicated artwork yet: reuse a related existing picture
 * until it lands (follow-ups tracked in specs/027-military-economy-technologies/spec.md and
 * specs/029-city-defenses/spec.md).
 */
const placeholder_image_src: Partial<Record<TechnologyCode, string>> = {
  [TechnologyCode.BALLISTIC_ALLOYS]: '/troops/war_machine.png',
  [TechnologyCode.ORGANIC_PLATING]: '/troops/legionnaire.png',
  [TechnologyCode.TACTICAL_PROPULSION]: '/troops/interceptor.png',
  [TechnologyCode.ADVANCED_RECYCLING]: '/buildings/recycling_plant.png',
  [TechnologyCode.AGRONOMY]: '/buildings/mushroom_farm.png',
  [TechnologyCode.STORAGE_COMPRESSION]: '/buildings/plastic_warehouse.png',
  [TechnologyCode.PLASMA_CONTAINMENT]: '/buildings/central_inductor.png',
  [TechnologyCode.FORTIFICATION]: '/troops/assault_behemoth.png',
}

export const technologyImageSrc = (code: TechnologyCode): string => {
  return placeholder_image_src[code] ?? `/technologies/${code}.png`
}
