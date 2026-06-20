import { FactionCode } from '#core/faction/constant/code'

export const SYSTEM_PLAYER_NAME = 'Alpha'
export const SYSTEM_CITY_NAME_PREFIX = 'Core'
export const SYSTEM_PLAYER_FACTION_CODE = FactionCode.THE_TECHNOLOGICAL_SINGULARITY

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

export function systemCityName(index: number): string {
  return `${SYSTEM_CITY_NAME_PREFIX} ${toRoman(index)}`
}

export const SYSTEM_FIRST_CITY_NAME = systemCityName(1)

export function nextSystemCityName(existing_names: string[]): string {
  const taken = new Set(existing_names)
  let index = 1
  while (taken.has(systemCityName(index))) {
    index += 1
  }
  return systemCityName(index)
}
