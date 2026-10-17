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
