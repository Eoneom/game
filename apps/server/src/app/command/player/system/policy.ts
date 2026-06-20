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

export function categoriesForTick(tick_index: number): SystemTickCategory[] {
  const count = SYSTEM_TICK_CATEGORIES.length
  const start = ((tick_index % count) + count) % count
  return [
    ...SYSTEM_TICK_CATEGORIES.slice(start),
    ...SYSTEM_TICK_CATEGORIES.slice(0, start),
  ]
}

export type SystemTickAction = (player_id: string) => Promise<boolean>

export async function actForSystemPlayer({
  player_id,
  tick_index,
  actions,
}: {
  player_id: string
  tick_index: number
  actions: Record<SystemTickCategory, SystemTickAction>
}): Promise<SystemTickCategory | null> {
  for (const category of categoriesForTick(tick_index)) {
    const acted = await actions[category](player_id)
    if (acted) {
      return category
    }
  }

  return null
}
