import { FactionCode } from '@server-core/faction/constant/code'
import { GenericResponse } from '../../response'

export interface PlayerSearchRequest {
  q: string
}

export interface PlayerSearchDataResponse {
  players: {
    id: string
    name: string
    faction_code: FactionCode
  }[]
}

export type PlayerSearchResponse = GenericResponse<PlayerSearchDataResponse>
