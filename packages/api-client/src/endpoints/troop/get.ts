import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface TroopGetRequest {
  troop_id: string
}

export interface TroopGetDataResponse {
  id: string
  code: TroopCode
  count: number
  ongoing_recruitment?: {
    finish_at: number
    remaining_count: number
    started_at: number
  }
  cost: {
    plastic: number
    mushroom: number
    plasma: number
    duration: number
  }
  requirement: Requirement
}

export type TroopGetResponse = GenericResponse<TroopGetDataResponse>
