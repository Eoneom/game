import { FactionCode } from '#core/faction/constant/code'

/**
 * Garrison life multiplier per Faction (slice 037): the city owner's own `combat`-role stacks get it when their
 * city is attacked (never in outposts, on the field, or as reinforcements). Missing factions are neutral (× 1).
 */
export const faction_garrison_life_modifier: Partial<Record<FactionCode, number>> = { [FactionCode.THE_BASTION_ORDER]: 1.15 }
