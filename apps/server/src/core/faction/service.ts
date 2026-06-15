import { FactionCode } from '#core/faction/constant/code'
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
}
