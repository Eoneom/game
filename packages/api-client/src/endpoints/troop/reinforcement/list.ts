import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'

export interface TroopReinforcementListRequest {
  city_id: string
}

export interface TroopReinforcementListDataResponse {
  reinforcements: {
    owner: { id: string, name: string }
    troops: { code: TroopCode, count: number }[]
  }[]
}

export type TroopReinforcementListResponse = GenericResponse<TroopReinforcementListDataResponse>

export interface TroopReinforcementAbroadDataResponse {
  reinforcements: {
    city: { id: string, name: string, coordinates: Coordinates }
    host: { id: string, name: string }
    troops: { code: TroopCode, count: number }[]
  }[]
}

export type TroopReinforcementAbroadResponse = GenericResponse<TroopReinforcementAbroadDataResponse>
