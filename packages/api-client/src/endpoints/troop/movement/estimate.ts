import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'

export interface TroopMovementEstimateRequest {
  origin: Coordinates
  destination: Coordinates
  troop_codes: TroopCode[]
  troops?: {
    code: TroopCode
    count: number
  }[]
}

export interface TroopMovementEstimateDataResponse {
  distance: number
  duration: number
  speed: number
  transport_capacity: number
}

export type TroopMovementEstimateResponse = GenericResponse<TroopMovementEstimateDataResponse>
