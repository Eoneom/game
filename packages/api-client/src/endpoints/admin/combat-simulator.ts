import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../response'

export type AdminCombatSimulatorStackWire = {
  troop_code: TroopCode
  count: number
}

export type AdminCombatSimulatorRoundSummaryWire = {
  round: number
  attacker_attack_pool: number
  defender_attack_pool: number
  attacker_life_pool: number
  defender_life_pool: number
  attacker_losses: AdminCombatSimulatorStackWire[]
  defender_losses: AdminCombatSimulatorStackWire[]
}

/** Arsenal levels applied to one side's `combat`-role stacks (slice 027); omitted = 0. */
export type AdminCombatSimulatorTechnologyLevelsWire = {
  ballistic_alloys?: number
  organic_plating?: number
}

export type AdminCombatSimulatorRequest = {
  attacker_stacks: AdminCombatSimulatorStackWire[]
  defender_stacks: AdminCombatSimulatorStackWire[]
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  attacker_technology_levels?: AdminCombatSimulatorTechnologyLevelsWire
  defender_technology_levels?: AdminCombatSimulatorTechnologyLevelsWire
}

export type AdminCombatSimulatorDataResponse = {
  winner: 'attacker' | 'defender' | 'draw' | null
  round_summaries: AdminCombatSimulatorRoundSummaryWire[]
  final_attacker_stacks: AdminCombatSimulatorStackWire[]
  final_defender_stacks: AdminCombatSimulatorStackWire[]
}

export type AdminCombatSimulatorResponse =
  GenericResponse<AdminCombatSimulatorDataResponse>
