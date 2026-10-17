import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'

type ClassMultipliers = Record<CombatTroopClass, { attack: number; life: number }>

type RoundMultipliers = Record<number, ClassMultipliers>

const balanced_round: ClassMultipliers = {
  [CombatTroopClass.LEGIONNAIRE]: { attack: 1, life: 1 },
  [CombatTroopClass.INTERCEPTOR]: { attack: 1, life: 1 },
  [CombatTroopClass.WAR_MACHINE]: { attack: 1, life: 1 },
  [CombatTroopClass.DISRUPTOR]: { attack: 1, life: 1 },
}

const opening_strike: RoundMultipliers = {
  1: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.12, life: 0.92 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.32, life: 0.78 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.08, life: 0.94 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.28, life: 0.74 },
  },
  2: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.08, life: 0.96 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.22, life: 0.83 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.06, life: 0.97 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.20, life: 0.80 },
  },
  3: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.04, life: 1.00 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.12, life: 0.88 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.04, life: 1.02 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.14, life: 0.86 },
  },
  4: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.00, life: 1.00 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.06, life: 0.94 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.02, life: 1.00 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.08, life: 0.92 },
  },
  5: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.00, life: 1.00 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.00, life: 1.00 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.00, life: 1.00 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.00, life: 1.00 },
  },
}

const hold_the_line: RoundMultipliers = {
  1: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 0.88, life: 1.18 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 0.82, life: 1.08 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 0.85, life: 1.22 },
    [CombatTroopClass.DISRUPTOR]: { attack: 0.84, life: 1.05 },
  },
  2: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 0.93, life: 1.22 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 0.87, life: 1.13 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 0.90, life: 1.28 },
    [CombatTroopClass.DISRUPTOR]: { attack: 0.88, life: 1.10 },
  },
  3: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 0.98, life: 1.28 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 0.92, life: 1.18 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 0.96, life: 1.34 },
    [CombatTroopClass.DISRUPTOR]: { attack: 0.92, life: 1.14 },
  },
  4: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.03, life: 1.32 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 0.97, life: 1.23 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.02, life: 1.38 },
    [CombatTroopClass.DISRUPTOR]: { attack: 0.96, life: 1.18 },
  },
  5: {
    [CombatTroopClass.LEGIONNAIRE]: { attack: 1.08, life: 1.38 },
    [CombatTroopClass.INTERCEPTOR]: { attack: 1.02, life: 1.28 },
    [CombatTroopClass.WAR_MACHINE]: { attack: 1.08, life: 1.45 },
    [CombatTroopClass.DISRUPTOR]: { attack: 1.00, life: 1.22 },
  },
}

export const combat_strategy_tables: Record<CombatStrategy, RoundMultipliers | 'flat'> = {
  [CombatStrategy.BALANCED]: 'flat',
  [CombatStrategy.OPENING_STRIKE]: opening_strike,
  [CombatStrategy.HOLD_THE_LINE]: hold_the_line,
}

export function getStrategyMultipliers({
  strategy,
  round,
  troop_class,
}: {
  strategy: CombatStrategy
  round: number
  troop_class: CombatTroopClass
}): { attack: number; life: number } {
  const r = Math.min(Math.max(round, 1), 5)
  const table = combat_strategy_tables[strategy]
  if (table === 'flat') {
    return balanced_round[troop_class]
  }
  return table[r][troop_class]
}
