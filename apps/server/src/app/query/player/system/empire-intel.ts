import { Factory } from '#adapter/factory'
import {
  getWorldViewportForOrigin,
  type SystemTickContext,
} from '#app/query/player/system/system-tick-context'
import { countCombatStacks } from '#core/combat/troop-combat'
import { combatRoleFor } from '#core/combat/troop-combat'
import { CombatRole } from '#core/troop/constant/combat-role'
import {
  EMPTY_SYSTEM_EMPIRE_INTEL,
  minDistanceToOwned,
  type SystemEmpireIntel,
  type SystemEmpireIntelSettlement,
  type SystemEmpireIntelThreat,
} from '#core/player/system/intel'
import type { Coordinates } from '#core/world/value/coordinates'

export async function collectSystemEmpireIntel({
  player_id,
  owned_coordinates,
  tick_context,
}: {
  player_id: string
  owned_coordinates: Coordinates[]
  tick_context?: SystemTickContext
}): Promise<SystemEmpireIntel> {
  if (owned_coordinates.length === 0) {
    return EMPTY_SYSTEM_EMPIRE_INTEL
  }

  const repository = Factory.getRepository()
  const settlement_map = new Map<string, SystemEmpireIntelSettlement>()
  const threat_map = new Map<string, SystemEmpireIntelThreat>()
  let visible_enemy_combat_stacks = 0

  for (const origin of owned_coordinates) {
    const viewport = await getWorldViewportForOrigin({
      player_id,
      origin,
      context: tick_context,
    })

    for (const city of viewport.settlements.cities) {
      if (city.player_id === player_id) {
        continue
      }
      settlement_map.set(city.id, {
        coordinates: city.coordinates,
        kind: 'city',
        player_id: city.player_id,
        is_human: true,
      })
    }

    for (const outpost of viewport.settlements.outposts) {
      if (outpost.player_id === player_id) {
        continue
      }
      settlement_map.set(outpost.id, {
        coordinates: outpost.coordinates,
        kind: 'outpost',
        player_id: outpost.player_id,
        is_human: true,
      })
    }

    const explored = new Set(viewport.explored_cell_ids)
    for (const cell of viewport.cells) {
      if (!explored.has(cell.id)) {
        continue
      }
      const stacks = await repository.troop.listAllInCell({ cell_id: cell.id })
      const enemy = stacks.filter(
        troop => troop.player_id !== player_id
          && troop.count > 0
          && troop.movement_id === null,
      )
      if (enemy.length === 0) {
        continue
      }
      const combat_stack_count = countCombatStacks(enemy.map(troop => ({
        code: troop.code,
        count: troop.count,
      })))
      const non_combat = enemy.some(troop => combatRoleFor(troop.code) !== CombatRole.COMBAT)
      if (combat_stack_count === 0 && !non_combat) {
        continue
      }
      const combat_count = combat_stack_count > 0
        ? combat_stack_count
        : enemy.reduce((sum, troop) => sum + troop.count, 0)
      visible_enemy_combat_stacks += combat_count
      const distance = minDistanceToOwned({
        point: cell.coordinates,
        owned_coordinates,
      })
      if (distance === null) {
        continue
      }
      const key = `${cell.coordinates.x},${cell.coordinates.y}`
      const existing = threat_map.get(key)
      if (!existing || combat_count > existing.combat_stack_count) {
        threat_map.set(key, {
          coordinates: cell.coordinates,
          combat_stack_count: combat_count,
          distance_to_nearest_owned: distance,
        })
      }
    }
  }

  const settlements = [ ...settlement_map.values() ]
  const threats = [ ...threat_map.values() ]
  let nearest_threat_distance: number | null = null
  for (const settlement of settlements) {
    const distance = minDistanceToOwned({
      point: settlement.coordinates,
      owned_coordinates,
    })
    if (distance === null) {
      continue
    }
    nearest_threat_distance = nearest_threat_distance === null
      ? distance
      : Math.min(nearest_threat_distance, distance)
  }
  for (const threat of threats) {
    nearest_threat_distance = nearest_threat_distance === null
      ? threat.distance_to_nearest_owned
      : Math.min(nearest_threat_distance, threat.distance_to_nearest_owned)
  }

  return {
    nearest_threat_distance,
    visible_enemy_combat_stacks,
    opponent_settlement_count: settlements.length,
    settlements,
    threats,
  }
}
