import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'

/** Troop stack; rows stored before slice 029 have no `kind` and are troops. */
export type TroopBattleStack = {
  kind?: 'troop'
  code: TroopCode
  count: number
  /**
   * Owner of a defender reinforcement stack (slice 033). Missing = the side's own player
   * (attacker, or the defender/host), which is every stack of battles without reinforcements.
   */
  player_id?: string
}

/** City defense stack on the defender side (slice 029). */
export type DefenseBattleStack = {
  kind: 'defense'
  code: DefenseCode
  count: number
}

export type BattleStack = TroopBattleStack | DefenseBattleStack

/** Same shape as a stack: defense lines carry `kind: 'defense'`, troop lines may omit `kind`. */
export type BattleCasualtyLine = BattleStack

export const isDefenseStack = (stack: BattleStack): stack is DefenseBattleStack => stack.kind === 'defense'

export const isTroopStack = (stack: BattleStack): stack is TroopBattleStack => stack.kind !== 'defense'

export type BattleRoundSummary = {
  round: number
  attacker_attack_pool: number
  defender_attack_pool: number
  attacker_life_pool: number
  defender_life_pool: number
  attacker_losses: BattleCasualtyLine[]
  defender_losses: BattleCasualtyLine[]
  /** Plasma the defender's batteries spent this round (slice 029); absent on older rounds (= 0). */
  defender_plasma_spent?: number
  /** Share of the attacker's attack pool removed by the defender's shield generators, 0–0.30 (slice 029). */
  shield_reduction?: number
}

/** Technology multipliers snapshotted for one side (slice 027 / 029). */
export type CombatModifiers = {
  /** Arsenal attack multiplier for `combat`-role troops. */
  attack: number
  /** Arsenal life multiplier for `combat`-role troops. */
  life: number
  /** Fortification multiplier for defense attack and life (slice 029); missing = 1. */
  fortification?: number
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
  /**
   * Arsenal modifiers of each defender reinforcement owner, keyed by `player_id` (slice 033).
   * Stacks without `player_id`, or owners missing here, use `defender_modifiers`.
   * Fortification always comes from `defender_modifiers` (the host's).
   */
  defender_owner_modifiers?: Record<string, CombatModifiers>
}

/** Arsenal modifiers of one troop stack: its owner's when keyed, the side's otherwise. */
export const stackModifiers = ({
  stack,
  modifiers,
  owner_modifiers,
}: {
  stack: TroopBattleStack
  modifiers: CombatModifiers
  owner_modifiers?: Record<string, CombatModifiers>
}): CombatModifiers => {
  const owner = stack.player_id ? owner_modifiers?.[stack.player_id] : undefined
  return owner ?? modifiers
}
