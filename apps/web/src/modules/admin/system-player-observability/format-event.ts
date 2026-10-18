import { translateError } from '#helpers/error-translations'
import type { SystemPlayerObservabilityEvent } from './types'
import {
  TICK_CATEGORY_LABEL,
  type ObservabilityTickCategory,
  translateBuildingCode,
  translateTechnologyCode,
  translateTroopCode,
} from './labels'
import {
  formatMoveTroops,
  formatTransportResources,
  isMovementCategoryWithTroops,
} from './format-move-troops'
import { BuildingCode, TechnologyCode, TroopCode } from '@eoneom/api-client'

function formatCoordinatesPair(payload: Record<string, unknown>): string | null {
  const origin = payload.origin as { x?: number, y?: number } | undefined
  const destination = payload.destination as { x?: number, y?: number } | undefined
  if (origin?.x != null && origin?.y != null && destination?.x != null && destination?.y != null) {
    return `(${origin.x},${origin.y}) → (${destination.x},${destination.y})`
  }
  return null
}

function formatSuccessSummary(event: SystemPlayerObservabilityEvent): string {
  const first_action = event.committed_actions?.[0]
  const category = first_action?.category as ObservabilityTickCategory | undefined
  if (!category) {
    return event.summary
  }

  const payload = first_action.payload ?? {}
  const head = `Joueur système ${event.player_name} — ${TICK_CATEGORY_LABEL[category]}`
  const details: string[] = []

  if (typeof payload.building_code === 'string') {
    const building_label = translateBuildingCode(payload.building_code as BuildingCode)
    if (category === 'upgrade' && typeof payload.building_level === 'number') {
      details.push(`${building_label} → niv. ${payload.building_level}`)
    } else {
      details.push(building_label)
    }
  }
  if (typeof payload.technology_code === 'string') {
    details.push(translateTechnologyCode(payload.technology_code as TechnologyCode))
  }
  if (typeof payload.troop_code === 'string' && !isMovementCategoryWithTroops(category)) {
    details.push(translateTroopCode(payload.troop_code as TroopCode))
  }
  if (typeof payload.city_name === 'string') {
    details.push(`colonie ${payload.city_name}`)
  } else if (typeof payload.city_id === 'string') {
    details.push(`colonie ${payload.city_id}`)
  }
  if (typeof payload.outpost_id === 'string' && (category === 'make-permanent' || category === 'deploy-outpost')) {
    details.push(`avant-poste ${payload.outpost_id}`)
  }
  if (isMovementCategoryWithTroops(category)) {
    const troops_line = formatMoveTroops(payload.move_troops)
    if (troops_line) {
      details.push(troops_line)
    }
  }
  if (category === 'transport') {
    const resources_line = formatTransportResources(payload.resources)
    if (resources_line) {
      details.push(resources_line)
    }
  }

  const coordinates = formatCoordinatesPair(payload)
  if (coordinates) {
    details.push(coordinates)
  }

  if (details.length === 0) {
    return head
  }

  return `${head} (${details.join(', ')})`
}

function formatIdleSummary(event: SystemPlayerObservabilityEvent): string {
  const tried = event.attempts
    .filter(attempt => attempt.result !== 'skipped')
    .map(attempt => TICK_CATEGORY_LABEL[attempt.category])
  if (tried.length === 0) {
    return `Joueur système ${event.player_name} — Aucune action réussie`
  }
  return `Joueur système ${event.player_name} — Aucune action réussie (${tried.join(' → ')})`
}

export function observabilityAttemptsForDisplay(
  event: SystemPlayerObservabilityEvent,
): SystemPlayerObservabilityEvent['attempts'] {
  return event.attempts.filter(attempt => attempt.result !== 'skipped')
}

function formatErrorSummary(event: SystemPlayerObservabilityEvent): string {
  const payload = event.payload ?? {}
  const code = typeof payload.error_code === 'string' ? payload.error_code : undefined
  const raw_message = typeof payload.error_message === 'string' ? payload.error_message : undefined
  const message = code
    ? translateError(code)
    : raw_message
      ? translateError(raw_message)
      : 'Erreur inconnue'
  return `Joueur système ${event.player_name} — Erreur : ${message}`
}

function formatPartialSummary(event: SystemPlayerObservabilityEvent): string {
  if (event.summary.includes('\n')) {
    return event.summary
  }
  const actions = event.committed_actions ?? []
  if (actions.length === 0) {
    return formatSuccessSummary(event)
  }
  const lines = actions.map(action => {
    const fake_event: SystemPlayerObservabilityEvent = {
      ...event,
      outcome: 'success',
      committed_actions: [ action ],
    }
    return `• ${formatSuccessSummary(fake_event).replace(/^Joueur système [^—]+ — /, '')}`
  })
  return `Joueur système ${event.player_name} — ${actions.length} actions :\n${lines.join('\n')}`
}

export function formatObservabilityEventSummary(event: SystemPlayerObservabilityEvent): string {
  if (event.outcome === 'success') {
    return formatSuccessSummary(event)
  }
  if (event.outcome === 'partial') {
    return formatPartialSummary(event)
  }
  if (event.outcome === 'idle') {
    return formatIdleSummary(event)
  }
  return formatErrorSummary(event)
}

export function formatObservabilityAttemptLabel(
  category: ObservabilityTickCategory,
  result: 'success' | 'skipped',
): string {
  const label = TICK_CATEGORY_LABEL[category]
  if (result === 'skipped') {
    return `${label} (ignoré)`
  }
  return label
}
