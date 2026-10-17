import { resolveAttackTarget } from '#app/command/troop/movement/attack-target'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { Factory } from '#adapter/factory'
import { countCombatStacks } from '#core/combat/troop-combat'
import { combatRoleFor } from '#core/combat/troop-combat'
import { CombatRole } from '#core/troop/constant/combat-role'
import { TroopCode } from '#core/troop/constant/code'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { FactionCode } from '#core/faction/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  WORLD_SIZE,
} from '#core/world/constant/size'
import {
  accumulateCombatArmyCounts,
  emptySystemCombatArmyCounts,
  isSystemCombatArmyReady,
  type SystemCombatArmyCounts,
} from '#command/player/system/troops'

export type { SystemCombatArmyCounts } from '#command/player/system/troops'
export {
  accumulateCombatArmyCounts,
  emptySystemCombatArmyCounts,
  isSystemCombatArmyReady,
} from '#command/player/system/troops'

export async function loadEmpireCombatArmyCounts(player_id: string): Promise<SystemCombatArmyCounts> {
  const counts = emptySystemCombatArmyCounts()
  const [
    { cities },
    { outposts },
  ] = await Promise.all([
    new CityListQuery().run({ player_id }),
    new OutpostListQuery().run({ player_id }),
  ])

  for (const city of cities) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'city',
        city_id: city.id,
      },
    })
    accumulateCombatArmyCounts(counts, troops)
  }

  for (const outpost of outposts) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })
    accumulateCombatArmyCounts(counts, troops)
  }

  return counts
}

function cellResourceScore(cell: CellEntity): number {
  return cell.resource_coefficient.plastic
    + cell.resource_coefficient.mushroom
    + cell.resource_coefficient.plasma * 2
}

export function scoreAttackTarget({
  target_kind,
  cell,
  defender_combat_count,
}: {
  target_kind: BattleTargetKind
  cell: CellEntity
  defender_combat_count: number
}): number {
  const kind_bonus = target_kind === BattleTargetKind.CITY
    ? 1000
    : target_kind === BattleTargetKind.OUTPOST
      ? 650
      : 200
  return kind_bonus + cellResourceScore(cell) * 12 - defender_combat_count * 8
}

export function combatStacksForAttack(troops: TroopEntity[]): { code: TroopCode; count: number }[] {
  return troops
    .filter(troop => troop.count > 0 && combatRoleFor(troop.code) === CombatRole.COMBAT)
    .map(troop => ({
      code: troop.code,
      count: troop.count,
    }))
}

type AttackCandidate = {
  origin: Coordinates
  destination: Coordinates
  score: number
  move_troops: { code: TroopCode; count: number }[]
}

async function defenderCombatCountOnCell({
  cell_id,
  attacker_player_id,
}: {
  cell_id: string
  attacker_player_id: string
}): Promise<number> {
  const repository = Factory.getRepository()
  const stacks = await repository.troop.listAllInCell({ cell_id })
  const enemy = stacks.filter(
    troop => troop.player_id !== attacker_player_id && troop.count > 0 && troop.movement_id === null,
  )
  return countCombatStacks(enemy.map(troop => ({
    code: troop.code,
    count: troop.count,
  })))
}

export async function pickSystemAttack({
  player_id,
  attacker_faction_code,
  army_counts,
}: {
  player_id: string
  attacker_faction_code: FactionCode
  army_counts: SystemCombatArmyCounts
}): Promise<AttackCandidate | null> {
  if (!isSystemCombatArmyReady(army_counts)) {
    return null
  }

  const { cities } = await new CityListQuery().run({ player_id })
  const { outposts, cells: outpost_cells } = await new OutpostListQuery().run({ player_id })

  const origins: {
    coordinates: Coordinates
    location: { type: 'city', city_id: string } | { type: 'outpost', outpost_id: string }
  }[] = []

  for (const city of cities) {
    const details = await new CityGetQuery().run({
      city_id: city.id,
      player_id,
    })
    origins.push({
      coordinates: details.cell.coordinates,
      location: {
        type: 'city',
        city_id: city.id,
      },
    })
  }

  outposts.forEach((outpost, index) => {
    const cell = outpost_cells[index]
    if (!cell) {
      return
    }
    origins.push({
      coordinates: cell.coordinates,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })
  })

  let best: AttackCandidate | null = null

  for (const origin of origins) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: origin.location,
    })
    const move_troops = combatStacksForAttack(troops)
    if (move_troops.length === 0) {
      continue
    }

    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin.coordinates),
    })

    for (const cell of viewport.cells) {
      if (cell.coordinates.x === origin.coordinates.x && cell.coordinates.y === origin.coordinates.y) {
        continue
      }

      try {
        const target = await resolveAttackTarget({
          attacker_player_id: player_id,
          attacker_faction_code,
          destination: cell.coordinates,
        })
        const defender_combat_count = await defenderCombatCountOnCell({
          cell_id: target.destination_cell_id,
          attacker_player_id: player_id,
        })
        const score = scoreAttackTarget({
          target_kind: target.target_kind,
          cell,
          defender_combat_count,
        })
        if (!best || score > best.score) {
          best = {
            origin: origin.coordinates,
            destination: cell.coordinates,
            score,
            move_troops,
          }
        }
      } catch {
        continue
      }
    }
  }

  return best
}

export const SYSTEM_ATTACK_COMBAT_STRATEGY = CombatStrategy.OPENING_STRIKE

function viewportAround(coordinates: Coordinates): {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
} {
  return {
    min_x: Math.max(1, coordinates.x - INITIAL_VIEWPORT_HALF_EXTENT),
    max_x: Math.min(WORLD_SIZE, coordinates.x + INITIAL_VIEWPORT_HALF_EXTENT),
    min_y: Math.max(1, coordinates.y - INITIAL_VIEWPORT_HALF_EXTENT),
    max_y: Math.min(WORLD_SIZE, coordinates.y + INITIAL_VIEWPORT_HALF_EXTENT),
  }
}
