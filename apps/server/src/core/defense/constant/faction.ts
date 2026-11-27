import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'

/** Faction-exclusive defenses (slice 036); a defense without an entry is common to every faction. */
export const defense_faction: Partial<Record<DefenseCode, FactionCode>> = {
  [DefenseCode.MYCELIUM_WALL]: FactionCode.THE_SYMBIOSIS,
  [DefenseCode.SPORE_CLOUD]: FactionCode.THE_SYMBIOSIS,
}
