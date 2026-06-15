import { GenericResponse } from '../../response'
import { FactionCode } from '@server-core/faction/constant/code'

export interface SignupRequest {
  player_name: string
  city_name: string
  faction_code: FactionCode
}

export type SignupResponse = GenericResponse<{
  player_id: string
  city_id: string
}>
