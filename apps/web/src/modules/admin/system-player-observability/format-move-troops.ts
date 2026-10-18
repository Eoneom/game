import { TroopCode } from '@eoneom/api-client'

import { RESOURCE_LABEL, translateTroopCode } from './labels'

export type MoveTroopEntry = { code?: string, count?: number }

const MOVEMENT_CATEGORIES_WITH_TROOPS = new Set([
  'explore',
  'base',
  'transport',
  'deploy-outpost',
  'attack',
])

export function isMovementCategoryWithTroops(category: string): boolean {
  return MOVEMENT_CATEGORIES_WITH_TROOPS.has(category)
}

export function formatMoveTroops(
  move_troops: unknown,
  translate: (code: TroopCode) => string = translateTroopCode,
): string | null {
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
    .map(entry => `${translate(entry.code as TroopCode)} ×${entry.count}`)

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
