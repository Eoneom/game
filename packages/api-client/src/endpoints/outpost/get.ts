import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'
import { OutpostType } from '@server-core/outpost/constant/type'
import { CombatStrategy } from '@server-core/combat/value/combat-strategy'

export interface OutpostGetRequest {
  outpost_id: string
}

export interface OutpostGetDataResponse {
  id: string
  coordinates: Coordinates
  type: OutpostType
  /** Strategy the garrison uses when defending (balanced when never set). */
  default_combat_strategy: CombatStrategy
  plastic: number
  mushroom: number
  plasma: number
  earnings_per_second: {
    plastic: number
    mushroom: number
    plasma: number
  }
  pre_cell_earnings_per_second: {
    plastic: number
    mushroom: number
    plasma: number
  }
  cell_resource_coefficient: {
    plastic: number
    mushroom: number
  }
  /** Économie technology multipliers (`advanced_recycling`, `agronomy`, `plasma_containment`); 1 = no bonus. */
  technology_production_multiplier: {
    plastic: number
    mushroom: number
    plasma: number
  }
  /** Faction production modifier (slice 036), stacked as `rate × faction × (1 + tech)`; 1 = neutral. */
  faction_production_multiplier: {
    plastic: number
    mushroom: number
  }
  warehouses_capacity: {
    plastic: number
    mushroom: number
  }
  warehouse_full_in_seconds: {
    plastic: number
    mushroom: number
  }
}

export type OutpostGetResponse = GenericResponse<OutpostGetDataResponse>
