import { queryClient } from '#helpers/query-client'
import { adminObservabilityWsClient } from '#helpers/admin-observability-websocket'
import { wsClient } from '#helpers/websocket'
import { clearSystemPlayerObservabilityEvents } from '#admin/system-player-observability/event-store'
import { clearSystemPlayerStatsSnapshots } from '#admin/system-player-observability/stats-store'

export const SESSION_CLEARED_EVENT = 'eoneom:session-cleared'

const INVALID_SESSION_ERROR_CODES = new Set([
  'auth:not-found',
  'token:not-found',
  'token:not_found',
  'player:not-found',
])

export const EMPTY_CITY_SESSION_ERROR = 'there is no city here 😬'

export const isInvalidSessionError = (message: string): boolean => {
  return INVALID_SESSION_ERROR_CODES.has(message) || message === EMPTY_CITY_SESSION_ERROR
}

/** Clears persisted auth and client caches; AuthProvider listens for SESSION_CLEARED_EVENT. */
export const invalidateSession = (): void => {
  window.localStorage.removeItem('token')
  clearSystemPlayerObservabilityEvents()
  clearSystemPlayerStatsSnapshots()
  wsClient.disconnect()
  adminObservabilityWsClient.disconnect()
  queryClient.clear()
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT))
}
