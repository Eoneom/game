export const SYSTEM_TICK_CATEGORIES = [
  'upgrade',
  'research',
  'recruit',
  'explore',
  'base',
  'settle',
  'make-permanent',
  'transport',
] as const

export type SystemTickCategory = typeof SYSTEM_TICK_CATEGORIES[number]
