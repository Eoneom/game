import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { DefenseCode } from '@server-core/defense/constant/code'
import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../response'

export type AdminCombatSimulatorStackWire = {
  troop_code: TroopCode
  count: number
}

/** City defense stack on the defender side (slice 029). */
export type AdminCombatSimulatorDefenseStackWire = {
  defense_code: DefenseCode
  count: number
}

/** Result line: troops carry `troop_code`, defenses `defense_code`. */
export type AdminCombatSimulatorResultStackWire =
  | AdminCombatSimulatorStackWire
  | AdminCombatSimulatorDefenseStackWire

export type AdminCombatSimulatorRoundSummaryWire = {
  round: number
  attacker_attack_pool: number
  defender_attack_pool: number
  attacker_life_pool: number
  defender_life_pool: number
  attacker_losses: AdminCombatSimulatorResultStackWire[]
  defender_losses: AdminCombatSimulatorResultStackWire[]
  defender_plasma_spent?: number
  shield_reduction?: number
  /** Spore clouds (slice 036), 0–0.15; never above 0.40 with `shield_reduction`. */
  spore_reduction?: number
  /** Barbed wire (slice 037), 0–0.10 in round 1 and 0–0.05 in round 2; within the 0.40 combined cap. */
  barbed_wire_reduction?: number
}

/** Arsenal levels applied to one side's `combat`-role stacks (slice 027); omitted = 0. */
export type AdminCombatSimulatorTechnologyLevelsWire = {
  ballistic_alloys?: number
  organic_plating?: number
  /** Defender defenses only (slice 029). */
  fortification?: number
}

export type AdminCombatSimulatorRequest = {
  attacker_stacks: AdminCombatSimulatorStackWire[]
  defender_stacks: AdminCombatSimulatorStackWire[]
  /** City defenses joining the defender (slice 029); omitted = none. */
  defender_defense_stacks?: AdminCombatSimulatorDefenseStackWire[]
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  attacker_technology_levels?: AdminCombatSimulatorTechnologyLevelsWire
  defender_technology_levels?: AdminCombatSimulatorTechnologyLevelsWire
  /** City plasma available to plasma batteries for the whole battle; omitted = unlimited. */
  defender_city_plasma?: number
}

export type AdminCombatSimulatorDataResponse = {
  winner: 'attacker' | 'defender' | 'draw' | null
  round_summaries: AdminCombatSimulatorRoundSummaryWire[]
  final_attacker_stacks: AdminCombatSimulatorResultStackWire[]
  final_defender_stacks: AdminCombatSimulatorResultStackWire[]
}

export type AdminCombatSimulatorResponse =
  GenericResponse<AdminCombatSimulatorDataResponse>
