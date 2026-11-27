import { FactionCode } from '@server-core/faction/constant/code'
import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'

/**
 * Incoming attack visible to the defender (slice 030). Optional fields depend on the live `detection` level:
 * `attacker`, `origin` and `departure_at` from 2 (origin and departure: slice 044), `unit_count` (rounded to the nearest 10) from 3, `troops` from 4. The strategy is never sent.
 */
export interface TroopIncomingMovement {
  id: string
  target: {
    kind: 'field' | 'city' | 'outpost'
    id: string | null
    /** City name; outposts and field stacks have none. */
    name: string | null
    coordinates: Coordinates
  }
  arrive_at: number
  /** Attacker's departure cell (detection ≥ 2). */
  origin?: Coordinates
  /** Departure time in ms (detection ≥ 2). */
  departure_at?: number
  attacker?: {
    name: string
    faction_code: FactionCode
  }
  unit_count?: number
  troops?: {
    code: TroopCode
    count: number
  }[]
}

export interface TroopListIncomingMovementDataResponse {
  /** Empty at `detection` 0. */
  movements: TroopIncomingMovement[]
}

export type TroopListIncomingMovementResponse = GenericResponse<TroopListIncomingMovementDataResponse>
