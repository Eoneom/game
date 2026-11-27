import { FactionCode } from '#core/faction/constant/code'

export type FactionLogisticsModifier = {
  /** Multiplier on the `transport_capacity` of the faction's `carrier`-role units. */
  transport_capacity: number
  /** Speed multiplier of the faction's movements that contain no `combat`-role unit. */
  non_combat_speed: number
}

/**
 * Logistics bonus per Faction (slice 039): carriers transport more, and movements without combat troops are faster.
 * Applied when a movement or a carrier allocation is computed. Missing factions are neutral (× 1).
 */
export const faction_logistics_modifier: Partial<Record<FactionCode, FactionLogisticsModifier>> = {
  [FactionCode.THE_CONFEDERATION]: {
    transport_capacity: 1.10,
    non_combat_speed: 1.05,
  },
}
