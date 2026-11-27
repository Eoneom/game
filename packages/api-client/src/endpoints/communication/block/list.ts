import { FactionCode } from '@server-core/faction/constant/code'
import { GenericResponse } from '../../../response'

export interface CommunicationBlockedPlayer {
  id: string
  name: string
  faction_code: FactionCode
  blocked_at: number
}

export interface CommunicationListBlockDataResponse {
  players: CommunicationBlockedPlayer[]
}

export type CommunicationListBlockResponse = GenericResponse<CommunicationListBlockDataResponse>
