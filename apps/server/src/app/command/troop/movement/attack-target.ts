import { Factory } from '#adapter/factory'
import { CombatError } from '#core/combat/error'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { FactionCode } from '#core/faction/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { Coordinates } from '#core/world/value/coordinates'

export type ResolvedAttackTarget = {
  defender_player_id: string
  defender_faction_code: FactionCode
  target_kind: BattleTargetKind
  target_id: string | null
  destination_cell_id: string
}

export async function resolveAttackTarget({
  attacker_player_id,
  attacker_faction_code,
  destination,
}: {
  attacker_player_id: string
  attacker_faction_code: FactionCode
  destination: Coordinates
}): Promise<ResolvedAttackTarget> {
  const repository = Factory.getRepository()
  const destination_cell = await repository.cell.getCell({ coordinates: destination })

  const city = await repository.city.searchByCell({ cell_id: destination_cell.id })
  if (city && !city.isOwnedBy(attacker_player_id)) {
    const defender = await repository.player.get(city.player_id)
    if (defender.faction_code === attacker_faction_code) {
      throw new Error(CombatError.SAME_FACTION_ATTACK)
    }
    return {
      defender_player_id: city.player_id,
      defender_faction_code: defender.faction_code,
      target_kind: BattleTargetKind.CITY,
      target_id: city.id,
      destination_cell_id: destination_cell.id,
    }
  }

  const outpost = await repository.outpost.searchByCell({ cell_id: destination_cell.id })
  if (outpost && !outpost.isOwnedBy(attacker_player_id)) {
    const defender = await repository.player.get(outpost.player_id)
    if (defender.faction_code === attacker_faction_code) {
      throw new Error(CombatError.SAME_FACTION_ATTACK)
    }
    return {
      defender_player_id: outpost.player_id,
      defender_faction_code: defender.faction_code,
      target_kind: BattleTargetKind.OUTPOST,
      target_id: outpost.id,
      destination_cell_id: destination_cell.id,
    }
  }

  const stacks = await repository.troop.listAllInCell({ cell_id: destination_cell.id })
  const enemy_stacks = stacks.filter(
    troop => troop.player_id !== attacker_player_id && troop.count > 0 && troop.movement_id === null
  )

  if (enemy_stacks.length === 0) {
    throw new Error(CombatError.NO_VALID_TARGET)
  }

  const defender_player_id = enemy_stacks[0].player_id
  const defender = await repository.player.get(defender_player_id)
  if (defender.faction_code === attacker_faction_code) {
    throw new Error(CombatError.SAME_FACTION_ATTACK)
  }

  const foreign = enemy_stacks.some(t => t.player_id !== defender_player_id)
  if (foreign) {
    throw new Error(CombatError.NO_VALID_TARGET)
  }

  return {
    defender_player_id,
    defender_faction_code: defender.faction_code,
    target_kind: BattleTargetKind.FIELD,
    target_id: null,
    destination_cell_id: destination_cell.id,
  }
}

export function stacksToBattleStacks(troops: TroopEntity[]): { code: TroopEntity['code']; count: number }[] {
  const map = new Map<string, number>()
  for (const troop of troops) {
    if (troop.count <= 0) {
      continue
    }
    map.set(troop.code, (map.get(troop.code) ?? 0) + troop.count)
  }
  return Array.from(map.entries()).map(([code, count]) => ({
    code: code as TroopEntity['code'],
    count,
  }))
}
