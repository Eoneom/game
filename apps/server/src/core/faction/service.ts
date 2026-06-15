import { FactionCode } from '#core/faction/constant/code'
import { non_playable_faction_codes } from '#core/faction/constant/playable'
import { FactionError } from '#core/faction/error'

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
}
