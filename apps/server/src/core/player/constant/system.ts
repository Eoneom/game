import { FactionCode } from '#core/faction/constant/code'
import { SystemAiProfileId } from '#core/player/system/ai-profile'

export const SYSTEM_PLAYER_NAME = 'Alpha'
export const HARROW_SYSTEM_PLAYER_NAME = 'Harrow'
export const SYSTEM_CITY_NAME_PREFIX = 'Core'
export const HARROW_CITY_NAME_PREFIX = 'Cinder'
export const SYSTEM_PLAYER_FACTION_CODE = FactionCode.THE_TECHNOLOGICAL_SINGULARITY
export const HARROW_PLAYER_FACTION_CODE = FactionCode.THE_ASH_LITURGY

/** Minimum Manhattan distance from Alpha's capital cell when spawning Harrow's Cinder I. */
export const SYSTEM_ASH_LITURGY_MIN_DISTANCE_FROM_ALPHA = 40

export type SystemEmpireBootstrapConfig = {
  player_name: string
  faction_code: FactionCode
  city_name_prefix: string
  ai_profile_id: SystemAiProfileId
  spawn: 'default' | 'min_distance_from_alpha'
}

export const SYSTEM_EMPIRE_BOOTSTRAP_ORDER: SystemEmpireBootstrapConfig[] = [
  {
    player_name: SYSTEM_PLAYER_NAME,
    faction_code: SYSTEM_PLAYER_FACTION_CODE,
    city_name_prefix: SYSTEM_CITY_NAME_PREFIX,
    ai_profile_id: SystemAiProfileId.SINGULARITY_DEFAULT,
    spawn: 'default',
  },
  {
    player_name: HARROW_SYSTEM_PLAYER_NAME,
    faction_code: HARROW_PLAYER_FACTION_CODE,
    city_name_prefix: HARROW_CITY_NAME_PREFIX,
    ai_profile_id: SystemAiProfileId.ASH_LITURGY_AGGRESSIVE,
    spawn: 'min_distance_from_alpha',
  },
]

const ROMAN_NUMERALS: [number, string][] = [
  [
    1000,
    'M' 
  ],
  [
    900,
    'CM' 
  ],
  [
    500,
    'D' 
  ],
  [
    400,
    'CD' 
  ],
  [
    100,
    'C' 
  ],
  [
    90,
    'XC' 
  ],
  [
    50,
    'L' 
  ],
  [
    40,
    'XL' 
  ],
  [
    10,
    'X' 
  ],
  [
    9,
    'IX' 
  ],
  [
    5,
    'V' 
  ],
  [
    4,
    'IV' 
  ],
  [
    1,
    'I' 
  ],
]

export function toRoman(value: number): string {
  if (value < 1) {
    throw new Error('roman numeral requires a positive integer')
  }

  let remaining = value
  let result = ''
  for (const [
    amount,
    numeral 
  ] of ROMAN_NUMERALS) {
    while (remaining >= amount) {
      result += numeral
      remaining -= amount
    }
  }
  return result
}

export function systemCityNameForPrefix(prefix: string, index: number): string {
  return `${prefix} ${toRoman(index)}`
}

export function systemCityName(index: number): string {
  return systemCityNameForPrefix(SYSTEM_CITY_NAME_PREFIX, index)
}

export const SYSTEM_FIRST_CITY_NAME = systemCityName(1)
export const HARROW_FIRST_CITY_NAME = systemCityNameForPrefix(HARROW_CITY_NAME_PREFIX, 1)

export function nextSystemCityName(existing_names: string[]): string {
  return nextSystemCityNameForPrefix(SYSTEM_CITY_NAME_PREFIX, existing_names)
}

export function nextSystemCityNameForPrefix(
  prefix: string,
  existing_names: string[],
): string {
  const taken = new Set(existing_names)
  let index = 1
  while (taken.has(systemCityNameForPrefix(prefix, index))) {
    index += 1
  }
  return systemCityNameForPrefix(prefix, index)
}
