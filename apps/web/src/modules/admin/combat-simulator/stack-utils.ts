import { TroopCode } from '@eoneom/api-client'
import { troop_characteristics } from '@server-core/troop/constant/characteristic'

import {
  CombatSimulatorFaction,
  CombatSimulatorStackRow,
  PVP_COMBAT_TROOP_CODES_BY_FACTION,
} from './hooks'

export type TroopCombatStatLine = {
  attack: number
  defense: number
  life: number
}

export type SideCombatTotals = {
  attack: number
  defense: number
  life: number
}

export const troopCombatStats = (troop_code: TroopCode): TroopCombatStatLine => {
  const stats = troop_characteristics[troop_code]
  return {
    attack: stats.attack_capacity,
    defense: stats.defense_capacity,
    life: stats.life_capacity ?? stats.defense_capacity,
  }
}

export const usedTroopCodes = (stacks: CombatSimulatorStackRow[]): Set<TroopCode> => {
  return new Set(stacks.map(row => row.troop_code))
}

export const availableTroopCodesForRow = (
  faction: CombatSimulatorFaction,
  stacks: CombatSimulatorStackRow[],
  row_index: number,
): TroopCode[] => {
  const all = PVP_COMBAT_TROOP_CODES_BY_FACTION[faction]
  const used_elsewhere = new Set(
    stacks
      .filter((_, i) => i !== row_index)
      .map(row => row.troop_code),
  )
  return all.filter(code => !used_elsewhere.has(code))
}

export const firstUnusedTroopCode = (
  faction: CombatSimulatorFaction,
  stacks: CombatSimulatorStackRow[],
): TroopCode | null => {
  const used = usedTroopCodes(stacks)
  const next = PVP_COMBAT_TROOP_CODES_BY_FACTION[faction].find(code => !used.has(code))
  return next ?? null
}

export const canAddCombatSimulatorStack = (
  faction: CombatSimulatorFaction,
  stacks: CombatSimulatorStackRow[],
): boolean => {
  return firstUnusedTroopCode(faction, stacks) !== null
}

export const computeSideCombatTotals = (stacks: CombatSimulatorStackRow[]): SideCombatTotals => {
  return stacks.reduce(
    (acc, row) => {
      const per_unit = troopCombatStats(row.troop_code)
      const count = row.count
      return {
        attack: acc.attack + per_unit.attack * count,
        defense: acc.defense + per_unit.defense * count,
        life: acc.life + per_unit.life * count,
      }
    },
    { attack: 0, defense: 0, life: 0 },
  )
}
