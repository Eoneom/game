import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { GenericResponse } from '../../response'

export interface CitySetCombatStrategyRequest {
  city_id: string
  combat_strategy: CombatStrategy
}

export type CitySetCombatStrategyResponse = GenericResponse<void>
