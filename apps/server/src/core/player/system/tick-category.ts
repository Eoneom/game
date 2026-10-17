export const SYSTEM_TICK_EXPANSION_CATEGORIES = [
  'base',
  'settle',
  'make-permanent',
  'explore',
] as const

/** Commit temp outposts (settle / permanent) before further scouting. */
export const SYSTEM_TICK_EXPANSION_CATEGORIES_COMMIT_FIRST = [
  'settle',
  'make-permanent',
  'base',
  'explore',
] as const

export const SYSTEM_TICK_ECONOMY_CATEGORIES = [
  'upgrade',
  'research',
  'recruit',
  'transport',
  'attack',
] as const

export const SYSTEM_TICK_CATEGORIES = [
  ...SYSTEM_TICK_EXPANSION_CATEGORIES,
  ...SYSTEM_TICK_ECONOMY_CATEGORIES,
] as const

export type SystemTickCategory = typeof SYSTEM_TICK_CATEGORIES[number]
