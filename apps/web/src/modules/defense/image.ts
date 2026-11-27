import { DefenseCode } from '@eoneom/api-client'

/**
 * Defenses have no dedicated artwork yet: reuse a related existing picture until
 * `/defenses/<code>.png` lands (follow-up tracked in specs/029-city-defenses/spec.md).
 */
const placeholder_image_src: Record<DefenseCode, string> = {
  [DefenseCode.RAMPART]: '/buildings/mushroom_warehouse.png',
  [DefenseCode.TURRET]: '/troops/war_machine.png',
  [DefenseCode.MINEFIELD]: '/troops/reclaimer.png',
  [DefenseCode.PLASMA_BATTERY]: '/buildings/central_inductor.png',
  [DefenseCode.SHIELD_GENERATOR]: '/buildings/solar_panel.png',
  [DefenseCode.MYCELIUM_WALL]: '/buildings/mushroom_farm.png',
  [DefenseCode.SPORE_CLOUD]: '/troops/spore_acolyte.png',
  [DefenseCode.FIELD_ARTILLERY]: '/troops/assault_behemoth.png',
  [DefenseCode.BARBED_WIRE]: '/buildings/plastic_warehouse.png',
}

export const defenseImageSrc = (code: DefenseCode): string => placeholder_image_src[code]
