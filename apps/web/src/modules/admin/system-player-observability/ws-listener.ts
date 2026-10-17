import { AppEvent } from '@eoneom/api-client'

import { wsClient } from '#helpers/websocket'
import { pushSystemPlayerObservabilityEvent } from './event-store'
import type { SystemPlayerObservabilityEvent } from './types'

let registered = false

export function registerSystemPlayerObservabilityWsListener(): void {
  if (registered) {
    return
  }
  registered = true

  wsClient.on(AppEvent.SystemPlayerActionCommitted, (raw) => {
    const message = raw as SystemPlayerObservabilityEvent & { type: string }
    pushSystemPlayerObservabilityEvent({
      committed_at: message.committed_at,
      player_id: message.player_id,
      player_name: message.player_name,
      tick_index: message.tick_index,
      category: message.category,
      summary: message.summary,
      payload: message.payload,
    })
  })
}

export function resetSystemPlayerObservabilityWsListenerForTests(): void {
  registered = false
}
