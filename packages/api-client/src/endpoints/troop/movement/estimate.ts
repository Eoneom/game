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
  /** Seconds (not ms). */
  duration: number
  speed: number
  transport_capacity: number
  destination_capacity_exceeded: boolean
  /** Bonuses applied by the estimate (slice 045). */
  modifiers: {
    /** Owner's Propulsion tactique level (slice 027); speeds up movements with `combat` units. */
    propulsion_level: number
    /** Faction logistics speed bonus for movements without `combat` units (slice 039). */
    non_combat_speed_multiplier: number
    /** Faction logistics bonus on carrier capacity (slice 039). */
    carrier_capacity_multiplier: number
  }
}

export type TroopMovementEstimateResponse = GenericResponse<TroopMovementEstimateDataResponse>
