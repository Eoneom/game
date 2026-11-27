import { FactionCode } from '#core/faction/constant/code'
import { Resource } from '#shared/resource'

/**
 * Passive production multiplier per Faction (slice 036), on every source of a resource (buildings and
 * troop earnings, cities and outposts). Missing factions or resources are neutral (× 1).
 */
export const faction_production_modifier: Partial<Record<FactionCode, Partial<Resource>>> = {
  [FactionCode.THE_SYMBIOSIS]: {
    mushroom: 1.1,
    plastic: 0.9,
  },
}
