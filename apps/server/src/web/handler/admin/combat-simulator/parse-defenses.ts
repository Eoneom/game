import { RequestError } from '@eoneom/api-client'
import { DefenseBattleStack } from '#core/combat/type/battle-stack'
import { DefenseCode } from '#core/defense/constant/code'

const DEFENSE_CODE_VALUES = new Set<string>(Object.values(DefenseCode))

/** Defender city defenses (slice 029); omitted = none. */
export function parseDefenseStacks(raw: unknown): { ok: true; stacks: DefenseBattleStack[] } | { ok: false; error_code: RequestError } {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      stacks: [] 
    }
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error_code: RequestError.TROOPS_NOT_FOUND 
    }
  }

  const stacks: DefenseBattleStack[] = []
  const seen_codes = new Set<string>()

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      return {
        ok: false,
        error_code: RequestError.TROOPS_NOT_FOUND 
      }
    }
    const defense_code = (entry as { defense_code?: unknown }).defense_code
    const count = (entry as { count?: unknown }).count

    if (typeof defense_code !== 'string' || !DEFENSE_CODE_VALUES.has(defense_code)) {
      return {
        ok: false,
        error_code: RequestError.DEFENSE_CODE_NOT_FOUND 
      }
    }
    if (seen_codes.has(defense_code)) {
      return {
        ok: false,
        error_code: RequestError.DEFENSE_CODE_DUPLICATE 
      }
    }
    seen_codes.add(defense_code)
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      return {
        ok: false,
        error_code: RequestError.COUNT_NOT_FOUND 
      }
    }

    stacks.push({
      kind: 'defense',
      code: defense_code as DefenseCode,
      count,
    })
  }

  return {
    ok: true,
    stacks 
  }
}

/** Omitted = unlimited plasma for batteries. */
export function parseCityPlasma(raw: unknown): { ok: true; plasma: number | undefined } | { ok: false; error_code: RequestError } {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      plasma: undefined 
    }
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    return {
      ok: false,
      error_code: RequestError.COUNT_NOT_FOUND 
    }
  }
  return {
    ok: true,
    plasma: Math.floor(raw) 
  }
}
