export enum CombatStrategy {
  BALANCED = 'balanced',
  OPENING_STRIKE = 'opening_strike',
  HOLD_THE_LINE = 'hold_the_line',
  SIEGE_ASSAULT = 'siege_assault',
}

const COMBAT_STRATEGY_VALUES = new Set<string>(Object.values(CombatStrategy))

export const isCombatStrategy = (value: unknown): value is CombatStrategy =>
  typeof value === 'string' && COMBAT_STRATEGY_VALUES.has(value)

/** Garrison default when the owner has not chosen one. */
export const resolveDefaultCombatStrategy = (value: CombatStrategy | null): CombatStrategy =>
  value ?? CombatStrategy.BALANCED
