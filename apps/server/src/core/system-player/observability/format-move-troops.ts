import type { SystemTickCategory } from '#core/player/system/tick-category'

import { translateTroopCodeForObservability } from './troop-label'

export type MoveTroopEntry = { code?: string, count?: number }

const MOVEMENT_CATEGORIES_WITH_TROOPS = new Set<SystemTickCategory>([
  'explore',
  'base',
  'transport',
  'deploy-outpost',
  'attack',
])

const RESOURCE_LABEL = {
  plastic: 'Plastique',
  mushroom: 'Champignon',
  plasma: 'Plasma',
} as const

export function isMovementCategoryWithTroops(category: SystemTickCategory): boolean {
  return MOVEMENT_CATEGORIES_WITH_TROOPS.has(category)
}

export function formatMoveTroops(move_troops: unknown): string | null {
  if (!Array.isArray(move_troops) || move_troops.length === 0) {
    return null
  }

  const parts = (move_troops as MoveTroopEntry[])
    .filter(
      entry =>
        typeof entry?.code === 'string'
        && typeof entry?.count === 'number'
        && entry.count > 0,
    )
    .map(entry => `${translateTroopCodeForObservability(entry.code!)} ×${entry.count}`)

  return parts.length > 0 ? parts.join(', ') : null
}

export function formatTransportResources(resources: unknown): string | null {
  if (resources == null || typeof resources !== 'object') {
    return null
  }

  const stock = resources as Record<string, unknown>
  const parts: string[] = []

  for (const key of Object.keys(RESOURCE_LABEL) as (keyof typeof RESOURCE_LABEL)[]) {
    const amount = stock[key]
    if (typeof amount === 'number' && amount > 0) {
      parts.push(`${RESOURCE_LABEL[key]} ${amount}`)
    }
  }

  return parts.length > 0 ? parts.join(', ') : null
}
