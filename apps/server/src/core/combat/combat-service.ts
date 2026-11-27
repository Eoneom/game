import { EXPOSURE_LIFE_MULT } from '#core/combat/constant/exposure'
import { CombatStrategyService } from '#core/combat/strategy-service'
import {
  BattleCasualtyLine,
  BattleRoundSummary,
  BattleStack,
  CombatModifiers,
  isDefenseStack,
  NEUTRAL_COMBAT_MODIFIERS,
  stackModifiers,
} from '#core/combat/type/battle-stack'
import {
  attackContribution,
  combatRoleFor,
  combatTroopClassFor,
  countBattlePresence,
  isHomogeneousCombatArmy,
  lifeCapacityFor,
  lifeContribution,
  maxAttackCapacityForCombatClass,
} from '#core/combat/troop-combat'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import {
  ATTACK_REDUCTION_CAP,
  BARBED_WIRE_REDUCTION_CAP_BY_ROUND,
  BARBED_WIRE_REDUCTION_PER_UNIT_BY_ROUND,
  defense_characteristics,
  PLASMA_BATTERY_PLASMA_PER_ROUND,
  SHIELD_REDUCTION_CAP,
  SHIELD_REDUCTION_PER_UNIT,
  SIEGE_DEFENSE_LIFE_MULTIPLIER,
  SPORE_REDUCTION_CAP,
  SPORE_REDUCTION_PER_UNIT,
} from '#core/defense/constant/characteristic'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseService } from '#core/defense/service'
import { CombatRole } from '#core/troop/constant/combat-role'

/** Losses are kept per stack owner: reinforcement lines carry their `player_id` (slice 033). */
function lineKey(line: BattleCasualtyLine): string {
  if (isDefenseStack(line)) {
    return `defense:${line.code}`
  }
  return line.player_id ? `troop:${line.code}:${line.player_id}` : `troop:${line.code}`
}

function mergeCasualties(
  lines: BattleCasualtyLine[],
  added: BattleCasualtyLine[]
): BattleCasualtyLine[] {
  const map = new Map<string, BattleCasualtyLine>()
  for (const line of [ ...lines, ...added ]) {
    const key = lineKey(line)
    const current = map.get(key)
    map.set(key, current
      ? { ...current, count: current.count + line.count }
      : { ...line })
  }
  return Array.from(map.values()).filter(line => line.count > 0)
}

type SidePools = {
  attack_pool: number
  life_pool: number
  class_attack: Map<CombatTroopClass, number>
  /** Plasma spent by this side's plasma batteries this round. */
  plasma_spent: number
}

/**
 * Defense pools (slice 029): only Fortification scales them (no strategy or Arsenal multiplier).
 * Attack follows each defense's per-round table when it has one (slice 037): minefields attack in round 1 only,
 * field artillery hits hardest in rounds 1–2. Minefields have no life; batteries fire up to the available plasma.
 */
function addDefensePools({
  stacks,
  round,
  fortification,
  plasma_available,
}: {
  stacks: BattleStack[]
  round: number
  fortification: number
  /** `undefined` = unlimited plasma (simulations). */
  plasma_available?: number
}): { attack: number; life: number; plasma_spent: number } {
  let attack = 0
  let life = 0
  let plasma_spent = 0

  for (const stack of stacks) {
    if (stack.count <= 0 || !isDefenseStack(stack)) {
      continue
    }
    const characteristic = defense_characteristics[stack.code]
    const unit_attack = DefenseService.getAttackForRound({
      code: stack.code,
      round
    })

    if (stack.code === DefenseCode.MINEFIELD) {
      attack += unit_attack * stack.count * fortification
      continue
    }

    if (stack.code === DefenseCode.PLASMA_BATTERY) {
      const plasma_left = plasma_available === undefined
        ? Infinity
        : Math.max(0, plasma_available - plasma_spent)
      const firing = Math.min(stack.count, Math.floor(plasma_left / PLASMA_BATTERY_PLASMA_PER_ROUND))
      plasma_spent += firing * PLASMA_BATTERY_PLASMA_PER_ROUND
      attack += unit_attack * firing * fortification
    } else {
      attack += unit_attack * stack.count * fortification
    }
    life += characteristic.life * stack.count * fortification
  }

  return { attack, life, plasma_spent }
}

function computePools({
  stacks,
  strategy,
  round,
  modifiers,
  owner_modifiers,
  defense_life_multiplier = 1,
  plasma_available,
}: {
  stacks: BattleStack[]
  strategy: CombatStrategy
  round: number
  modifiers: CombatModifiers
  /** Per-owner Arsenal modifiers of reinforcement stacks (slice 033). */
  owner_modifiers?: Record<string, CombatModifiers>
  /** 75 % when the opposing side uses `siege_assault` (slice 029). */
  defense_life_multiplier?: number
  plasma_available?: number
}): SidePools {
  let attack_pool = 0
  let life_pool = 0
  const class_attack = new Map<CombatTroopClass, number>()

  for (const stack of stacks) {
    if (stack.count <= 0 || isDefenseStack(stack)) {
      continue
    }
    const role = combatRoleFor(stack.code)
    if (role === CombatRole.COMBAT) {
      const arsenal = stackModifiers({
        stack,
        modifiers,
        owner_modifiers,
      })
      // Garrison (slice 037): the side's own stacks only, never reinforcements (which carry a `player_id`).
      const garrison = stack.player_id ? 1 : modifiers.garrison ?? 1
      const cls = combatTroopClassFor(stack.code)
      const mult = cls
        ? CombatStrategyService.getMultipliers({
          strategy,
          round,
          troop_class: cls,
        })
        : { attack: 1, life: 1 }
      const att = attackContribution({
        code: stack.code,
        count: stack.count,
        attack_multiplier: mult.attack * arsenal.attack,
      })
      attack_pool += att
      if (cls) {
        class_attack.set(cls, (class_attack.get(cls) ?? 0) + att)
      }
      life_pool += lifeContribution({
        code: stack.code,
        count: stack.count,
        life_multiplier: mult.life * arsenal.life * garrison,
      })
    } else {
      attack_pool += attackContribution({ code: stack.code, count: stack.count })
      life_pool += lifeContribution({ code: stack.code, count: stack.count })
    }
  }

  // Exposure is a troop-army penalty: it applies to the troop life only.
  if (isHomogeneousCombatArmy(stacks)) {
    life_pool = Math.floor(life_pool * EXPOSURE_LIFE_MULT)
  }

  const defense = addDefensePools({
    stacks,
    round,
    fortification: modifiers.fortification ?? 1,
    plasma_available,
  })

  return {
    attack_pool: attack_pool + defense.attack,
    life_pool: life_pool + defense.life * defense_life_multiplier,
    class_attack,
    plasma_spent: defense.plasma_spent,
  }
}

function countDefense(stacks: BattleStack[], code: DefenseCode): number {
  return stacks.reduce(
    (sum, s) => sum + (isDefenseStack(s) && s.code === code ? Math.max(0, s.count) : 0),
    0
  )
}

/**
 * Shares of the opposing attack pool removed by surviving defenses: shield generators `min(0.30, 0.02 × n)`
 * (slice 029), spore clouds `min(0.15, 0.01 × n)` (slice 036) and barbed wire `min(0.10, 0.01 × n)` in round 1,
 * `min(0.05, 0.005 × n)` in round 2, nothing afterwards (slice 037), capped at 0.40 together. Shares are granted
 * in that order: each one is what is left under the combined cap once the previous ones are counted.
 */
function attackReductions(stacks: BattleStack[], round: number): { shield: number; spore: number; barbed_wire: number } {
  const shield = Math.min(SHIELD_REDUCTION_CAP, SHIELD_REDUCTION_PER_UNIT * countDefense(stacks, DefenseCode.SHIELD_GENERATOR))
  const spore_raw = Math.min(SPORE_REDUCTION_CAP, SPORE_REDUCTION_PER_UNIT * countDefense(stacks, DefenseCode.SPORE_CLOUD))
  const spore = Math.max(0, Math.min(spore_raw, ATTACK_REDUCTION_CAP - shield))
  const wire_per_unit = BARBED_WIRE_REDUCTION_PER_UNIT_BY_ROUND[round - 1] ?? 0
  const wire_cap = BARBED_WIRE_REDUCTION_CAP_BY_ROUND[round - 1] ?? 0
  const wire_raw = Math.min(wire_cap, wire_per_unit * countDefense(stacks, DefenseCode.BARBED_WIRE))
  const barbed_wire = Math.max(0, Math.min(wire_raw, ATTACK_REDUCTION_CAP - shield - spore))
  return {
    shield,
    spore,
    barbed_wire,
  }
}

function dominantClass(class_attack: Map<CombatTroopClass, number>): CombatTroopClass | null {
  let best: CombatTroopClass | null = null
  let best_val = -1
  for (const [cls, val] of class_attack) {
    if (val > best_val) {
      best_val = val
      best = cls
    } else if (val === best_val && best) {
      const a = maxAttackCapacityForCombatClass(cls)
      const b = maxAttackCapacityForCombatClass(best)
      if (a > b) {
        best = cls
      }
    }
  }
  return best
}

type CasualtyTiers = {
  barbed_wire: number
  rampart: number
  combat: number
  turret: number
  plasma_battery: number
  shield_generator: number
}

/**
 * Casualty tiers (slice 029). Without defenses this is the former order:
 * combat → carrier → civilian → scout. Barbed wire stands in front of the walls (slice 037).
 */
const NORMAL_TIER: CasualtyTiers = {
  barbed_wire: 0,
  rampart: 1,
  combat: 2,
  turret: 3,
  plasma_battery: 4,
  shield_generator: 5,
}

const SIEGE_TIER: CasualtyTiers = {
  barbed_wire: 0,
  rampart: 1,
  shield_generator: 2,
  plasma_battery: 3,
  turret: 4,
  combat: 5,
}

/** Tier group of each targetable defense: faction defenses share a common one (slices 036 / 037). */
const DEFENSE_TIER_GROUP: Record<Exclude<DefenseCode, DefenseCode.MINEFIELD>, Exclude<keyof CasualtyTiers, 'combat'>> = {
  [DefenseCode.RAMPART]: 'rampart',
  [DefenseCode.MYCELIUM_WALL]: 'rampart',
  [DefenseCode.TURRET]: 'turret',
  [DefenseCode.SPORE_CLOUD]: 'turret',
  [DefenseCode.FIELD_ARTILLERY]: 'turret',
  [DefenseCode.BARBED_WIRE]: 'barbed_wire',
  [DefenseCode.PLASMA_BATTERY]: 'plasma_battery',
  [DefenseCode.SHIELD_GENERATOR]: 'shield_generator',
}

const NON_COMBAT_TIER: Record<Exclude<CombatRole, CombatRole.COMBAT>, number> = {
  [CombatRole.CARRIER]: 6,
  [CombatRole.CIVILIAN]: 7,
  [CombatRole.SCOUT]: 8,
}

function casualtySortKey({
  stack,
  dominant,
  siege,
}: {
  stack: BattleStack
  dominant: CombatTroopClass | null
  siege: boolean
}): number {
  const tiers = siege ? SIEGE_TIER : NORMAL_TIER
  if (isDefenseStack(stack)) {
    // Minefields are never casualty candidates (filtered out in `applyLosses`).
    const tier = tiers[DEFENSE_TIER_GROUP[stack.code as Exclude<DefenseCode, DefenseCode.MINEFIELD>]]
    return tier * 1_000_000
  }
  const role = combatRoleFor(stack.code)
  const tier = role === CombatRole.COMBAT ? tiers.combat : NON_COMBAT_TIER[role]
  const cls = combatTroopClassFor(stack.code)
  const focus = dominant && cls === dominant ? 0 : 1
  const life = lifeCapacityFor(stack.code)
  return tier * 1_000_000 + focus * 100_000 + life * 100
}

function toLossLine(stack: BattleStack, count: number): BattleCasualtyLine {
  if (isDefenseStack(stack)) {
    return {
      kind: 'defense',
      code: stack.code,
      count
    }
  }
  const line = {
    code: stack.code,
    count
  }
  return stack.player_id
    ? {
      ...line,
      player_id: stack.player_id
    }
    : line
}

function applyLosses({
  stacks,
  loss_budget,
  dominant_class,
  siege = false,
}: {
  stacks: BattleStack[]
  loss_budget: number
  dominant_class: CombatTroopClass | null
  /** The opposing side uses `siege_assault`: siege casualty order. */
  siege?: boolean
}): { stacks: BattleStack[]; losses: BattleCasualtyLine[] } {
  const mutable = stacks.map(s => ({ ...s }))
  const losses: BattleCasualtyLine[] = []
  let budget = loss_budget

  const candidates = mutable
    // Minefields cannot be targeted.
    .filter(s => s.count > 0 && !(isDefenseStack(s) && s.code === DefenseCode.MINEFIELD))
    .sort((a, b) => {
      const ka = casualtySortKey({ stack: a, dominant: dominant_class, siege })
      const kb = casualtySortKey({ stack: b, dominant: dominant_class, siege })
      if (ka !== kb) {
        return ka - kb
      }
      return a.count - b.count
    })

  for (const stack of candidates) {
    if (budget <= 0) {
      break
    }
    const take = Math.min(stack.count, budget)
    if (take <= 0) {
      continue
    }
    stack.count -= take
    budget -= take
    losses.push(toLossLine(stack, take))
  }

  return {
    stacks: mutable.filter(s => s.count > 0),
    losses,
  }
}

/** Minefields fire once: after the round they fired in, the whole stack is consumed (and counted as lost). */
function consumeMinefields(result: { stacks: BattleStack[]; losses: BattleCasualtyLine[] }): {
  stacks: BattleStack[]
  losses: BattleCasualtyLine[]
} {
  const mines = result.stacks.filter(s => isDefenseStack(s) && s.code === DefenseCode.MINEFIELD && s.count > 0)
  if (mines.length === 0) {
    return result
  }
  return {
    stacks: result.stacks.filter(s => !(isDefenseStack(s) && s.code === DefenseCode.MINEFIELD)),
    losses: mergeCasualties(result.losses, mines.map(s => toLossLine(s, s.count))),
  }
}

export function resolveBattleWinner({
  attacker_stacks,
  defender_stacks,
  round,
  max_round,
}: {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  round: number
  max_round: number
}): BattleWinner | null {
  // Combat troops + armed defenses; ramparts, mines and shields alone do not hold a position.
  const att_combat = countBattlePresence(attacker_stacks)
  const def_combat = countBattlePresence(defender_stacks)

  if (def_combat === 0 && att_combat > 0) {
    return BattleWinner.ATTACKER
  }
  if (att_combat === 0 && def_combat > 0) {
    return BattleWinner.DEFENDER
  }
  if (att_combat === 0 && def_combat === 0) {
    return BattleWinner.DRAW
  }
  if (round >= max_round) {
    return BattleWinner.DRAW
  }
  return null
}

export class CombatService {
  static advanceRound({
    round,
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
    attacker_modifiers = NEUTRAL_COMBAT_MODIFIERS,
    defender_modifiers = NEUTRAL_COMBAT_MODIFIERS,
    defender_owner_modifiers,
    defender_plasma,
  }: {
    round: number
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    attacker_strategy: CombatStrategy
    defender_strategy: CombatStrategy
    attacker_modifiers?: CombatModifiers
    defender_modifiers?: CombatModifiers
    /** Arsenal modifiers of defender reinforcement owners, keyed by `player_id` (slice 033). */
    defender_owner_modifiers?: Record<string, CombatModifiers>
    /** City plasma available to the defender's batteries this round; `undefined` = unlimited. */
    defender_plasma?: number
  }): {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    round_summary: BattleRoundSummary
    winner: BattleWinner | null
  } {
    const siege = attacker_strategy === CombatStrategy.SIEGE_ASSAULT

    const att_pools = computePools({
      stacks: attacker_stacks,
      strategy: attacker_strategy,
      round,
      modifiers: attacker_modifiers,
    })
    const def_pools = computePools({
      stacks: defender_stacks,
      strategy: defender_strategy,
      round,
      modifiers: defender_modifiers,
      owner_modifiers: defender_owner_modifiers,
      defense_life_multiplier: siege ? SIEGE_DEFENSE_LIFE_MULTIPLIER : 1,
      plasma_available: defender_plasma,
    })

    const {
      shield: shield_reduction,
      spore: spore_reduction,
      barbed_wire: barbed_wire_reduction,
    } = attackReductions(defender_stacks, round)
    const attacker_attack_pool = att_pools.attack_pool * (1 - shield_reduction - spore_reduction - barbed_wire_reduction)

    const att_dominant = dominantClass(att_pools.class_attack)
    const def_dominant = dominantClass(def_pools.class_attack)

    const def_loss_budget = attacker_attack_pool > 0
      ? Math.max(1, Math.floor(attacker_attack_pool / Math.max(1, def_pools.life_pool)))
      : 0
    const att_loss_budget = def_pools.attack_pool > 0
      ? Math.max(1, Math.floor(def_pools.attack_pool / Math.max(1, att_pools.life_pool)))
      : 0

    const def_result = consumeMinefields(def_loss_budget > 0
      ? applyLosses({
        stacks: defender_stacks,
        loss_budget: def_loss_budget,
        dominant_class: att_dominant,
        siege,
      })
      : { stacks: defender_stacks, losses: [] as BattleCasualtyLine[] })

    const att_result = att_loss_budget > 0
      ? applyLosses({
        stacks: attacker_stacks,
        loss_budget: att_loss_budget,
        dominant_class: def_dominant,
      })
      : { stacks: attacker_stacks, losses: [] as BattleCasualtyLine[] }

    const round_summary: BattleRoundSummary = {
      round,
      attacker_attack_pool,
      defender_attack_pool: def_pools.attack_pool,
      attacker_life_pool: att_pools.life_pool,
      defender_life_pool: def_pools.life_pool,
      attacker_losses: att_result.losses,
      defender_losses: def_result.losses,
      defender_plasma_spent: def_pools.plasma_spent,
      shield_reduction,
      spore_reduction,
      barbed_wire_reduction,
    }

    const winner = resolveBattleWinner({
      attacker_stacks: att_result.stacks,
      defender_stacks: def_result.stacks,
      round,
      max_round: 5,
    })

    return {
      attacker_stacks: att_result.stacks,
      defender_stacks: def_result.stacks,
      round_summary,
      winner,
    }
  }

  static mergeCumulativeLosses = mergeCasualties

  static simulateBattle({
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
    attacker_modifiers = NEUTRAL_COMBAT_MODIFIERS,
    defender_modifiers = NEUTRAL_COMBAT_MODIFIERS,
    defender_owner_modifiers,
    defender_plasma,
    max_round = 5,
  }: {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    attacker_strategy: CombatStrategy
    defender_strategy: CombatStrategy
    attacker_modifiers?: CombatModifiers
    defender_modifiers?: CombatModifiers
    defender_owner_modifiers?: Record<string, CombatModifiers>
    /** City plasma for the defender's batteries over the whole battle; `undefined` = unlimited. */
    defender_plasma?: number
    max_round?: number
  }): {
    winner: BattleWinner | null
    round_summaries: BattleRoundSummary[]
    final_attacker_stacks: BattleStack[]
    final_defender_stacks: BattleStack[]
  } {
    let current_attacker = attacker_stacks.map(s => ({ ...s }))
    let current_defender = defender_stacks.map(s => ({ ...s }))
    let plasma_left = defender_plasma
    const round_summaries: BattleRoundSummary[] = []
    let winner: BattleWinner | null = null

    for (let round = 1; round <= max_round; round++) {
      const result = CombatService.advanceRound({
        round,
        attacker_stacks: current_attacker,
        defender_stacks: current_defender,
        attacker_strategy,
        defender_strategy,
        attacker_modifiers,
        defender_modifiers,
        defender_owner_modifiers,
        defender_plasma: plasma_left,
      })
      round_summaries.push(result.round_summary)
      current_attacker = result.attacker_stacks
      current_defender = result.defender_stacks
      if (plasma_left !== undefined) {
        plasma_left = Math.max(0, plasma_left - (result.round_summary.defender_plasma_spent ?? 0))
      }
      winner = result.winner
      if (winner !== null) {
        break
      }
    }

    return {
      winner,
      round_summaries,
      final_attacker_stacks: current_attacker,
      final_defender_stacks: current_defender,
    }
  }
}
