import type { SystemTickCategory } from '#core/player/system/tick-category'

const CATEGORY_LABEL: Record<SystemTickCategory, string> = {
  upgrade: 'Amélioration de bâtiment',
  research: 'Recherche technologique',
  recruit: 'Recrutement de troupes',
  explore: 'Mouvement de troupes (exploration)',
  base: 'Mouvement de troupes (avant-poste)',
  settle: 'Fondation de colonie',
  'make-permanent': 'Avant-poste rendu permanent',
  transport: 'Transport de ressources',
}

function formatCoordinates(payload: Record<string, unknown>): string | null {
  const origin = payload.origin as { x?: number, y?: number } | undefined
  const destination = payload.destination as { x?: number, y?: number } | undefined
  if (origin?.x != null && origin?.y != null && destination?.x != null && destination?.y != null) {
    return `(${origin.x},${origin.y}) → (${destination.x},${destination.y})`
  }
  return null
}

export function formatSystemPlayerActionSummary({
  player_name,
  category,
  payload,
}: {
  player_name: string
  category: SystemTickCategory
  payload: Record<string, unknown>
}): string {
  const head = `Joueur système ${player_name} — ${CATEGORY_LABEL[category]}`
  const details: string[] = []

  if (typeof payload.building_code === 'string') {
    details.push(payload.building_code)
  }
  if (typeof payload.technology_code === 'string') {
    details.push(payload.technology_code)
  }
  if (typeof payload.troop_code === 'string') {
    details.push(payload.troop_code)
  }
  if (typeof payload.city_name === 'string') {
    details.push(`colonie ${payload.city_name}`)
  } else if (typeof payload.city_id === 'string') {
    details.push(`colonie ${payload.city_id}`)
  }
  if (typeof payload.outpost_id === 'string' && category === 'make-permanent') {
    details.push(`avant-poste ${payload.outpost_id}`)
  }

  const coordinates = formatCoordinates(payload)
  if (coordinates) {
    details.push(coordinates)
  }

  if (details.length === 0) {
    return head
  }

  return `${head} (${details.join(', ')})`
}
