import { EXPOSURE_LIFE_MULT } from '#core/combat/constant/exposure'
import { CombatStrategyService } from '#core/combat/strategy-service'
import {
  BattleCasualtyLine,
  BattleRoundSummary,
  BattleStack,
} from '#core/combat/type/battle-stack'
import {
  attackContribution,
  combatRoleFor,
  combatTroopClassFor,
  countCombatStacks,
  isHomogeneousCombatArmy,
  lifeCapacityFor,
  lifeContribution,
  maxAttackCapacityForCombatClass,
} from '#core/combat/troop-combat'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { CombatRole } from '#core/troop/constant/combat-role'
import { troop_characteristics } from '#core/troop/constant/characteristic'
import { TroopCode } from '#core/troop/constant/code'

function mergeCasualties(
  lines: BattleCasualtyLine[],
  added: BattleCasualtyLine[]
): BattleCasualtyLine[] {
  const map = new Map<TroopCode, number>()
  for (const line of lines) {
    map.set(line.code, (map.get(line.code) ?? 0) + line.count)
  }
  for (const line of added) {
    map.set(line.code, (map.get(line.code) ?? 0) + line.count)
  }
  return Array.from(map.entries())
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ code, count }))
}

function computePools({
  stacks,
  strategy,
  round,
}: {
  stacks: BattleStack[]
  strategy: CombatStrategy
  round: number
}): { attack_pool: number; life_pool: number; class_attack: Map<CombatTroopClass, number> } {
  let attack_pool = 0
  let life_pool = 0
  const class_attack = new Map<CombatTroopClass, number>()

  for (const stack of stacks) {
    if (stack.count <= 0) {
      continue
    }
    const role = combatRoleFor(stack.code)
    if (role === CombatRole.COMBAT) {
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
        attack_multiplier: mult.attack,
      })
      attack_pool += att
      if (cls) {
        class_attack.set(cls, (class_attack.get(cls) ?? 0) + att)
      }
      life_pool += lifeContribution({
        code: stack.code,
        count: stack.count,
        life_multiplier: mult.life,
      })
    } else {
      attack_pool += attackContribution({ code: stack.code, count: stack.count })
      life_pool += lifeContribution({ code: stack.code, count: stack.count })
    }
  }

  if (isHomogeneousCombatArmy(stacks)) {
    life_pool = Math.floor(life_pool * EXPOSURE_LIFE_MULT)
  }

  return { attack_pool, life_pool, class_attack }
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

function casualtySortKey({
  code,
  dominant,
}: {
  code: TroopCode
  dominant: CombatTroopClass | null
}): number {
  const role = combatRoleFor(code)
  const role_order =
    role === CombatRole.COMBAT ? 0
      : role === CombatRole.CARRIER ? 1
        : role === CombatRole.CIVILIAN ? 2
          : 3
  const cls = combatTroopClassFor(code)
  const focus = dominant && cls === dominant ? 0 : 1
  const life = lifeCapacityFor(code)
  return role_order * 1_000_000 + focus * 100_000 + life * 100
}

function applyLosses({
  stacks,
  loss_budget,
  dominant_class,
}: {
  stacks: BattleStack[]
  loss_budget: number
  dominant_class: CombatTroopClass | null
}): { stacks: BattleStack[]; losses: BattleCasualtyLine[] } {
  const mutable = stacks.map(s => ({ ...s }))
  const losses: BattleCasualtyLine[] = []
  let budget = loss_budget

  const candidates = mutable
    .filter(s => s.count > 0)
    .sort((a, b) => {
      const ka = casualtySortKey({ code: a.code, dominant: dominant_class })
      const kb = casualtySortKey({ code: b.code, dominant: dominant_class })
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
    losses.push({ code: stack.code, count: take })
  }

  return {
    stacks: mutable.filter(s => s.count > 0),
    losses,
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
  const att_combat = countCombatStacks(attacker_stacks)
  const def_combat = countCombatStacks(defender_stacks)

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
  }: {
    round: number
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    attacker_strategy: CombatStrategy
    defender_strategy: CombatStrategy
  }): {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    round_summary: BattleRoundSummary
    winner: BattleWinner | null
  } {
    const att_pools = computePools({
      stacks: attacker_stacks,
      strategy: attacker_strategy,
      round,
    })
    const def_pools = computePools({
      stacks: defender_stacks,
      strategy: defender_strategy,
      round,
    })

    const att_dominant = dominantClass(att_pools.class_attack)
    const def_dominant = dominantClass(def_pools.class_attack)

    const def_loss_budget = att_pools.attack_pool > 0
      ? Math.max(1, Math.floor(att_pools.attack_pool / Math.max(1, def_pools.life_pool)))
      : 0
    const att_loss_budget = def_pools.attack_pool > 0
      ? Math.max(1, Math.floor(def_pools.attack_pool / Math.max(1, att_pools.life_pool)))
      : 0

    const def_result = def_loss_budget > 0
      ? applyLosses({
        stacks: defender_stacks,
        loss_budget: def_loss_budget,
        dominant_class: att_dominant,
      })
      : { stacks: defender_stacks, losses: [] as BattleCasualtyLine[] }

    const att_result = att_loss_budget > 0
      ? applyLosses({
        stacks: attacker_stacks,
        loss_budget: att_loss_budget,
        dominant_class: def_dominant,
      })
      : { stacks: attacker_stacks, losses: [] as BattleCasualtyLine[] }

    const round_summary: BattleRoundSummary = {
      round,
      attacker_attack_pool: att_pools.attack_pool,
      defender_attack_pool: def_pools.attack_pool,
      attacker_life_pool: att_pools.life_pool,
      defender_life_pool: def_pools.life_pool,
      attacker_losses: att_result.losses,
      defender_losses: def_result.losses,
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
    max_round = 5,
  }: {
    attacker_stacks: BattleStack[]
    defender_stacks: BattleStack[]
    attacker_strategy: CombatStrategy
    defender_strategy: CombatStrategy
    max_round?: number
  }): {
    winner: BattleWinner | null
    round_summaries: BattleRoundSummary[]
    final_attacker_stacks: BattleStack[]
    final_defender_stacks: BattleStack[]
  } {
    let current_attacker = attacker_stacks.map(s => ({ ...s }))
    let current_defender = defender_stacks.map(s => ({ ...s }))
    const round_summaries: BattleRoundSummary[] = []
    let winner: BattleWinner | null = null

    for (let round = 1; round <= max_round; round++) {
      const result = CombatService.advanceRound({
        round,
        attacker_stacks: current_attacker,
        defender_stacks: current_defender,
        attacker_strategy,
        defender_strategy,
      })
      round_summaries.push(result.round_summary)
      current_attacker = result.attacker_stacks
      current_defender = result.defender_stacks
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
