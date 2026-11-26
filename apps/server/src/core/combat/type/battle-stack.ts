import { TroopCode } from '#core/troop/constant/code'

export type BattleStack = {
  code: TroopCode
  count: number
}

export type BattleCasualtyLine = {
  code: TroopCode
  count: number
}

export type BattleRoundSummary = {
  round: number
  attacker_attack_pool: number
  defender_attack_pool: number
  attacker_life_pool: number
  defender_life_pool: number
  attacker_losses: BattleCasualtyLine[]
  defender_losses: BattleCasualtyLine[]
}

/** Technology multipliers for one side's `combat`-role stacks (slice 027). */
export type CombatModifiers = {
  attack: number
  life: number
}

export const NEUTRAL_COMBAT_MODIFIERS: CombatModifiers = {
  attack: 1,
  life: 1,
}

export type BattleStateJson = {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_origin: { x: number; y: number }
  cumulative_attacker_losses: BattleCasualtyLine[]
  cumulative_defender_losses: BattleCasualtyLine[]
  /** Snapshot at battle start; absent on battles started before slice 027 (= neutral). */
  attacker_modifiers?: CombatModifiers
  defender_modifiers?: CombatModifiers
}
