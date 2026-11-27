import { GenericResponse } from '../../../response'

export interface CommunicationUnblockPlayerRequest {
  player_id: string
}

export type CommunicationUnblockPlayerResponse = GenericResponse<void>
