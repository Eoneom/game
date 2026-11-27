import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { DefenseCode } from '@server-core/defense/constant/code'
import { FactionCode } from '@server-core/faction/constant/code'
import { TroopCode } from '@server-core/troop/constant/code'

export type ReportBattleOutcome = {
  occupied: boolean
  destroyed_temp_outpost: boolean
  loot_applied: boolean
  attacker_retreated: boolean
}

type ReportBattleModifiers = {
  attack: number
  life: number
  /** Defender: Fortification multiplier of the city's defenses (slice 029); missing = 1. */
  fortification?: number
}

/** Loss line: troop lines may omit `kind`; city defense lines carry `kind: 'defense'` (slice 029). */
export type ReportBattleLossLine =
  | { kind?: 'troop'; code: TroopCode; count: number }
  | { kind: 'defense'; code: DefenseCode; count: number }

export type ReportBattleMetadata = {
  battle_id: string
  movement_id: string
  perspective: 'attacker' | 'defender'
  attacker_player_id: string
  defender_player_id: string
  attacker_faction_code: FactionCode
  defender_faction_code: FactionCode
  target_kind: 'field' | 'city' | 'outpost'
  target_id?: string | null
  winner: 'attacker' | 'defender' | 'draw'
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  rounds_played: number
  outcome: ReportBattleOutcome
  casualties_attacker: ReportBattleLossLine[]
  casualties_defender: ReportBattleLossLine[]
  round_summaries: {
    round: number
    attacker_attack_pool: number
    defender_attack_pool: number
    attacker_life_pool: number
    defender_life_pool: number
    attacker_losses: ReportBattleLossLine[]
    defender_losses: ReportBattleLossLine[]
    /** Plasma the defender's batteries spent this round (slice 029); absent on older reports. */
    defender_plasma_spent?: number
    /** Share of the attacker's attack pool absorbed by shield generators, 0–0.30 (slice 029). */
    shield_reduction?: number
  }[]
  /** Defender perspective: resources the underground shelter kept out of loot (slice 028); zero otherwise. */
  sheltered: {
    plastic: number
    mushroom: number
    plasma: number
  }
  /** Arsenal technology multipliers for each side's `combat`-role stacks (1 = no bonus). */
  attacker_modifiers?: ReportBattleModifiers
  defender_modifiers?: ReportBattleModifiers
}
