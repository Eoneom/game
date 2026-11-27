import { TroopCode } from '@server-core/troop/constant/code'
import { MovementAction } from '@server-core/troop/constant/movement-action'
import { MovementKind } from '@server-core/troop/constant/movement-kind'
import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface TroopGetMovementRequest {
  movement_id: string
}

export interface TroopGetMovementDataResponse {
  action: MovementAction
  /** Movements page tab (slice 045). */
  kind: MovementKind
  /** Attack strategy; `null` for every other action. */
  combat_strategy: CombatStrategy | null
  /** Set while an arrived attack movement is in battle; `arrive_at` is then the battle start. */
  battle_id: string | null
  origin: Coordinates
  destination: Coordinates
  /** Departure time (ms), from `movement.started_at` (slice 044). */
  departure_at: number
  arrive_at: number
  resources: Resource
  troops: {
    code: TroopCode
    count: number
  }[]
}

export type TroopGetMovementResponse = GenericResponse<TroopGetMovementDataResponse>
