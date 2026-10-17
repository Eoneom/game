import { AppEvent } from '@eoneom/api-client'

import { adminObservabilityWsClient } from '#helpers/admin-observability-websocket'
import { pushSystemPlayerObservabilityEvent } from './event-store'
import { patchSystemPlayerStatsSnapshot } from './stats-store'
import type { SystemPlayerObservabilityEvent } from './types'
import type { AdminSystemPlayerStatsSnapshot } from '@eoneom/api-client'

let registered = false

export function registerSystemPlayerObservabilityWsListener(): void {
  if (registered) {
    return
  }
  registered = true

  adminObservabilityWsClient.on(AppEvent.SystemPlayerActionCommitted, (raw) => {
    const message = raw as SystemPlayerObservabilityEvent & { type: string }
    pushSystemPlayerObservabilityEvent({
      committed_at: message.committed_at,
      player_id: message.player_id,
      player_name: message.player_name,
      tick_index: message.tick_index,
      outcome: message.outcome ?? 'success',
      attempts: message.attempts ?? [],
      category: message.category,
      summary: message.summary,
      payload: message.payload,
    })
  })

  adminObservabilityWsClient.on(AppEvent.SystemPlayerStatsUpdated, (raw) => {
    const message = raw as AdminSystemPlayerStatsSnapshot & { type: string }
    patchSystemPlayerStatsSnapshot({
      player_id: message.player_id,
      player_name: message.player_name,
      cities: message.cities,
      outposts: message.outposts,
      technologies: message.technologies,
      buildings_by_city: message.buildings_by_city,
      updated_at: message.updated_at,
    })
  })
}

export function resetSystemPlayerObservabilityWsListenerForTests(): void {
  registered = false
}
