import { FactionCode } from '#core/faction/constant/code'
import { faction_garrison_life_modifier } from '#core/faction/constant/garrison-modifier'
import { non_playable_faction_codes } from '#core/faction/constant/playable'
import { faction_production_modifier } from '#core/faction/constant/production-modifier'
import { FactionError } from '#core/faction/error'
import { Resource } from '#shared/resource'

const known_codes = new Set<string>(Object.values(FactionCode))

export class FactionService {
  static isKnown(code: string): code is FactionCode {
    return known_codes.has(code)
  }

  static assertKnown(code: string): asserts code is FactionCode {
    if (!this.isKnown(code)) {
      throw new Error(FactionError.NOT_FOUND)
    }
  }

  static isPlayable(code: string): code is FactionCode {
    return this.isKnown(code) && !non_playable_faction_codes.has(code)
  }

  static assertPlayable(code: string): asserts code is FactionCode {
    this.assertKnown(code)
    if (!this.isPlayable(code)) {
      throw new Error(FactionError.NOT_PLAYABLE)
    }
  }

  /** Faction production multipliers (slice 036), neutral (1) for every resource the faction does not modify. */
  static getProductionMultipliers(faction_code: FactionCode): Resource {
    const modifier = faction_production_modifier[faction_code] ?? {}
    return {
      plastic: modifier.plastic ?? 1,
      mushroom: modifier.mushroom ?? 1,
      plasma: modifier.plasma ?? 1,
      water: modifier.water ?? 1,
    }
  }

  /** Garrison life multiplier (slice 037) for the city owner's own combat stacks, neutral (1) for most factions. */
  static getGarrisonLifeMultiplier(faction_code: FactionCode): number {
    return faction_garrison_life_modifier[faction_code] ?? 1
  }
}
