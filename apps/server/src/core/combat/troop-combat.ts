import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { CombatRole } from '#core/troop/constant/combat-role'
import { troop_characteristics } from '#core/troop/constant/characteristic'
import { TroopCode } from '#core/troop/constant/code'

export function combatRoleFor(code: TroopCode): CombatRole {
  return troop_characteristics[code].combat_role
}

export function combatTroopClassFor(code: TroopCode): CombatTroopClass | null {
  return troop_characteristics[code].combat_troop_class ?? null
}

export function lifeCapacityFor(code: TroopCode): number {
  const c = troop_characteristics[code]
  if (c.combat_role === CombatRole.COMBAT) {
    return c.life_capacity ?? c.defense_capacity
  }
  return c.defense_capacity
}

export function attackContribution({
  code,
  count,
  attack_multiplier = 1,
}: {
  code: TroopCode
  count: number
  attack_multiplier?: number
}): number {
  const c = troop_characteristics[code]
  switch (c.combat_role) {
  case CombatRole.COMBAT:
    return count * c.attack_capacity * attack_multiplier
  case CombatRole.SCOUT:
    return count * c.attack_capacity * 0.25
  default:
    return 0
  }
}

export function lifeContribution({
  code,
  count,
  life_multiplier = 1,
}: {
  code: TroopCode
  count: number
  life_multiplier?: number
}): number {
  const c = troop_characteristics[code]
  switch (c.combat_role) {
  case CombatRole.COMBAT:
    return count * (c.life_capacity ?? c.defense_capacity) * life_multiplier
  case CombatRole.CARRIER:
    return count * c.defense_capacity * 0.5
  case CombatRole.CIVILIAN:
    return count * c.defense_capacity * 0.25
  case CombatRole.SCOUT:
    return count * c.defense_capacity * 0.5
  default:
    return 0
  }
}

export function countCombatStacks(stacks: { code: TroopCode; count: number }[]): number {
  return stacks
    .filter(s => s.count > 0 && combatRoleFor(s.code) === CombatRole.COMBAT)
    .reduce((sum, s) => sum + s.count, 0)
}

export function isHomogeneousCombatArmy(stacks: { code: TroopCode; count: number }[]): boolean {
  const classes = new Set<CombatTroopClass>()
  for (const stack of stacks) {
    if (stack.count <= 0) {
      continue
    }
    if (combatRoleFor(stack.code) !== CombatRole.COMBAT) {
      continue
    }
    const cls = combatTroopClassFor(stack.code)
    if (cls) {
      classes.add(cls)
    }
  }
  return classes.size === 1
}
