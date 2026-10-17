import { GenericResponse } from '../../response'

export type AdminSystemPlayerSummary = {
  id: string
  name: string
}

export interface AdminSystemPlayerObservabilityDataResponse {
  is_admin: boolean
  system_players?: AdminSystemPlayerSummary[]
}

export type AdminSystemPlayerObservabilityResponse =
  GenericResponse<AdminSystemPlayerObservabilityDataResponse>

export type SystemPlayerTickAttempt = {
  category: string
  result: 'skipped' | 'success'
}

export type SystemPlayerTickObservabilityOutcome = 'success' | 'idle' | 'error'

/** WebSocket payload for `system-player:action-committed` (admin fan-out). */
export type SystemPlayerTickObservabilityMessage = {
  type: 'system-player:action-committed'
  committed_at: number
  player_id: string
  player_name: string
  tick_index: number
  outcome: SystemPlayerTickObservabilityOutcome
  attempts: SystemPlayerTickAttempt[]
  category?: string
  summary: string
  payload: Record<string, unknown>
}
