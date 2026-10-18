import { FactionCode, TroopCode } from '@eoneom/api-client'

import {
  availableTroopCodesForRow,
  canAddCombatSimulatorStack,
  combatSimulatorCountOptions,
  computeSideCombatTotals,
  firstUnusedTroopCode,
  troopCombatStats,
} from './stack-utils'

describe('troopCombatStats', () => {
  it('returns attack, defense, and life for PvP combat troops', () => {
    expect(troopCombatStats(TroopCode.LEGIONNAIRE)).toEqual({
      attack: 11,
      defense: 13,
      life: 15,
    })
  })
})

describe('availableTroopCodesForRow', () => {
  const faction = FactionCode.THE_CONFEDERATION

  it('excludes codes picked on other rows but keeps the current row code', () => {
    const stacks = [
      { troop_code: TroopCode.LEGIONNAIRE, count: 1 },
      { troop_code: TroopCode.INTERCEPTOR, count: 2 },
    ]

    expect(availableTroopCodesForRow(faction, stacks, 0)).toEqual([
      TroopCode.LEGIONNAIRE,
      TroopCode.ASSAULT_BEHEMOTH,
      TroopCode.SHOCK_TROOPER,
    ])
    expect(availableTroopCodesForRow(faction, stacks, 1)).toContain(TroopCode.INTERCEPTOR)
    expect(availableTroopCodesForRow(faction, stacks, 1)).not.toContain(TroopCode.LEGIONNAIRE)
  })
})

describe('firstUnusedTroopCode', () => {
  it('returns the first faction code not present in stacks', () => {
    const faction = FactionCode.THE_TECHNOLOGICAL_SINGULARITY
    const stacks = [
      { troop_code: TroopCode.PRIME_UNIT, count: 1 },
      { troop_code: TroopCode.STRIKER_DRONE, count: 1 },
    ]

    expect(firstUnusedTroopCode(faction, stacks)).toBe(TroopCode.WAR_MACHINE)
  })

  it('returns null when all four codes are used', () => {
    const faction = FactionCode.THE_CONFEDERATION
    const stacks = [
      { troop_code: TroopCode.LEGIONNAIRE, count: 1 },
      { troop_code: TroopCode.INTERCEPTOR, count: 1 },
      { troop_code: TroopCode.ASSAULT_BEHEMOTH, count: 1 },
      { troop_code: TroopCode.SHOCK_TROOPER, count: 1 },
    ]

    expect(firstUnusedTroopCode(faction, stacks)).toBeNull()
    expect(canAddCombatSimulatorStack(faction, stacks)).toBe(false)
  })
})

describe('combatSimulatorCountOptions', () => {
  it('includes presets and the current value when non-standard', () => {
    expect(combatSimulatorCountOptions(20)).toContain(20)
    expect(combatSimulatorCountOptions(33)).toContain(33)
  })
})

describe('computeSideCombatTotals', () => {
  it('sums count × per-unit stats across stacks', () => {
    const totals = computeSideCombatTotals([
      { troop_code: TroopCode.LEGIONNAIRE, count: 10 },
      { troop_code: TroopCode.INTERCEPTOR, count: 5 },
    ])

    expect(totals).toEqual({
      attack: 11 * 10 + 18 * 5,
      defense: 13 * 10 + 4 * 5,
      life: 15 * 10 + 5 * 5,
    })
  })
})
