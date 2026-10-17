export const SYSTEM_TICK_EXPANSION_CATEGORIES = [
  'explore',
  'base',
  'settle',
  'make-permanent',
] as const

export const SYSTEM_TICK_ECONOMY_CATEGORIES = [
  'upgrade',
  'research',
  'recruit',
  'transport',
] as const

export const SYSTEM_TICK_CATEGORIES = [
  ...SYSTEM_TICK_EXPANSION_CATEGORIES,
  ...SYSTEM_TICK_ECONOMY_CATEGORIES,
] as const

export type SystemTickCategory = typeof SYSTEM_TICK_CATEGORIES[number]
