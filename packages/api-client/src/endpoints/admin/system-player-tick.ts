import { GenericResponse } from '../../response'

export interface AdminForceSystemPlayerTickDataResponse {
  tick_index: number
  next_tick_index: number
  next_execute_at: number
  system_player_count: number
}

export type AdminForceSystemPlayerTickResponse =
  GenericResponse<AdminForceSystemPlayerTickDataResponse>
