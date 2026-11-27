import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'

/** Faction-exclusive defenses (slices 036 / 037 / 039); a defense without an entry is common to every faction. */
export const defense_faction: Partial<Record<DefenseCode, FactionCode>> = {
  [DefenseCode.MYCELIUM_WALL]: FactionCode.THE_SYMBIOSIS,
  [DefenseCode.SPORE_CLOUD]: FactionCode.THE_SYMBIOSIS,
  [DefenseCode.FIELD_ARTILLERY]: FactionCode.THE_BASTION_ORDER,
  [DefenseCode.BARBED_WIRE]: FactionCode.THE_BASTION_ORDER,
  [DefenseCode.RAILGUN]: FactionCode.THE_CONFEDERATION,
  [DefenseCode.HOLO_DECOY]: FactionCode.THE_CONFEDERATION,
}
