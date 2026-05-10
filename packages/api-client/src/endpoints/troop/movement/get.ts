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
