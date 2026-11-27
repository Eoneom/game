import { TroopCode } from '@server-core/troop/constant/code'
import { MovementAction } from '@server-core/troop/constant/movement-action'
import { MovementKind } from '@server-core/troop/constant/movement-kind'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopListMovementDataResponse {
  movements: {
    id: string
    action: MovementAction
    /** Movements page tab (slice 045): `convoy` for exchange convoys, `return` for trips home, else `outgoing`. */
    kind: MovementKind
    origin: Coordinates
    destination: Coordinates
    /** Arrival time (ms); the battle start while `battle_id` is set. */
    arrive_at: number
    /** Set while an arrived attack is in battle. */
    battle_id: string | null
    resources: Resource
    troops: {
      code: TroopCode
      count: number
    }[]
  }[]
}

export type TroopListMovementResponse = GenericResponse<TroopListMovementDataResponse>
