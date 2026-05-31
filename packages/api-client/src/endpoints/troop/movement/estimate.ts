import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopMovementEstimateRequest {
  origin: Coordinates
  destination: Coordinates
  troop_codes: TroopCode[]
  troops?: {
    code: TroopCode
    count: number
  }[]
  resources?: Resource
}

export interface TroopMovementEstimateDataResponse {
  distance: number
  duration: number
  speed: number
  transport_capacity: number
  destination_capacity_exceeded: boolean
}

export type TroopMovementEstimateResponse = GenericResponse<TroopMovementEstimateDataResponse>
