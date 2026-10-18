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

export type AdminCombatSimulatorRequest = {
  attacker_stacks: AdminCombatSimulatorStackWire[]
  defender_stacks: AdminCombatSimulatorStackWire[]
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
}

export type AdminCombatSimulatorDataResponse = {
  winner: 'attacker' | 'defender' | 'draw' | null
  round_summaries: AdminCombatSimulatorRoundSummaryWire[]
  final_attacker_stacks: AdminCombatSimulatorStackWire[]
  final_defender_stacks: AdminCombatSimulatorStackWire[]
}

export type AdminCombatSimulatorResponse =
  GenericResponse<AdminCombatSimulatorDataResponse>
