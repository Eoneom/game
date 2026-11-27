import { GenericResponse } from '../../../response'

export interface TroopMovementCapacityDataResponse {
  /** Movements the player currently owns (every action). */
  used: number
  /** `5 + Σ command_center level` over the player's cities. */
  limit: number
}

export type TroopMovementCapacityResponse = GenericResponse<TroopMovementCapacityDataResponse>
