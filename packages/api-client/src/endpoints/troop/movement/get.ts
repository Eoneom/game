import { TroopCode } from '@server-core/troop/constant/code'
import { MovementAction } from '@server-core/troop/constant/movement-action'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopGetMovementRequest {
  movement_id: string
}

export interface TroopGetMovementDataResponse {
  action: MovementAction
  /** Set while an arrived attack movement is in battle; `arrive_at` is then the battle start. */
  battle_id: string | null
  origin: Coordinates
  destination: Coordinates
  arrive_at: number
  resources: Resource
  troops: {
    code: TroopCode
    count: number
  }[]
}

export type TroopGetMovementResponse = GenericResponse<TroopGetMovementDataResponse>
