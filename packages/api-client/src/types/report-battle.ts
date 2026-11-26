import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
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
}

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
  casualties_attacker: { code: TroopCode; count: number }[]
  casualties_defender: { code: TroopCode; count: number }[]
  round_summaries: {
    round: number
    attacker_attack_pool: number
    defender_attack_pool: number
    attacker_life_pool: number
    defender_life_pool: number
    attacker_losses: { code: TroopCode; count: number }[]
    defender_losses: { code: TroopCode; count: number }[]
  }[]
  /** Arsenal technology multipliers for each side's `combat`-role stacks (1 = no bonus). */
  attacker_modifiers?: ReportBattleModifiers
  defender_modifiers?: ReportBattleModifiers
}
