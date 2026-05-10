import { MovementAction } from '@server-core/troop/constant/movement-action'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopListMovementDataResponse {
  movements: {
    id: string
    action: MovementAction
    origin: Coordinates
    destination: Coordinates
    arrive_at: number
    resources: Resource
  }[]
}

export type TroopListMovementResponse = GenericResponse<TroopListMovementDataResponse>
