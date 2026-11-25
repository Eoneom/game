import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { GenericResponse } from '../../response'

export interface OutpostSetCombatStrategyRequest {
  outpost_id: string
  combat_strategy: CombatStrategy
}

export type OutpostSetCombatStrategyResponse = GenericResponse<void>
