import { TroopCode } from '@server-core/troop/constant/code'
import { MovementAction } from '@server-core/troop/constant/movement-action'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopMovementCreateRequest {
  origin: Coordinates
  destination: Coordinates
  action: MovementAction
  troops: {
    code: TroopCode
    count: number
  }[]
  resources?: Resource
}

interface TroopMovementCreateDataResponse {
  deleted_outpost_id?: string
}

export type TroopMovementCreateResponse = GenericResponse<TroopMovementCreateDataResponse>
