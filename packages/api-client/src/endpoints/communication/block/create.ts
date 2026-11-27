import { GenericResponse } from '../../../response'

export interface CommunicationBlockPlayerRequest {
  player_name: string
}

export interface CommunicationBlockPlayerDataResponse {
  blocked_id: string
}

export type CommunicationBlockPlayerResponse = GenericResponse<CommunicationBlockPlayerDataResponse>
