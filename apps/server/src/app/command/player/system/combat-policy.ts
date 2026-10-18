import { simulateCombat } from '#app/command/combat/simulate'
import { resolveAttackTarget } from '#app/command/troop/movement/attack-target'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import {
  getWorldViewportForOrigin,
  type SystemTickContext,
} from '#app/query/player/system/system-tick-context'
import { Factory } from '#adapter/factory'
import { countCombatStacks } from '#core/combat/troop-combat'
import { combatRoleFor, combatTroopClassFor } from '#core/combat/troop-combat'
import { CombatRole } from '#core/troop/constant/combat-role'
import { TroopCode } from '#core/troop/constant/code'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { FactionCode } from '#core/faction/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  isCoordinatesBlocked,
  type SystemPlayerMemoryCoordinates,
} from '#core/player/system/memory'
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
  defender_faction_code,
  confederation_target_score_bonus = 0,
}: {
  target_kind: BattleTargetKind
  cell: CellEntity
  defender_combat_count: number
  defender_faction_code?: FactionCode
  confederation_target_score_bonus?: number
}): number {
  const kind_bonus = target_kind === BattleTargetKind.CITY
    ? 1000
    : target_kind === BattleTargetKind.OUTPOST
      ? 650
      : 200
  const faction_bonus = defender_faction_code === FactionCode.THE_CONFEDERATION
    ? confederation_target_score_bonus
    : 0
  return kind_bonus + faction_bonus + cellResourceScore(cell) * 12 - defender_combat_count * 8
}

export function combatStacksForAttack(troops: TroopEntity[]): { code: TroopCode; count: number }[] {
  return troops
    .filter(troop => troop.count > 0 && combatRoleFor(troop.code) === CombatRole.COMBAT)
    .map(troop => ({
      code: troop.code,
      count: troop.count,
    }))
}

export function pickAttackerStrategyForDefender(
  defender_stacks: { code: TroopCode, count: number }[],
): CombatStrategy {
  const class_counts = new Map<CombatTroopClass, number>()
  for (const stack of defender_stacks) {
    if (stack.count <= 0 || combatRoleFor(stack.code) !== CombatRole.COMBAT) {
      continue
    }
    const combat_class = combatTroopClassFor(stack.code)
    if (!combat_class) {
      continue
    }
    class_counts.set(combat_class, (class_counts.get(combat_class) ?? 0) + stack.count)
  }
  const war_machine = class_counts.get(CombatTroopClass.WAR_MACHINE) ?? 0
  const disruptor = class_counts.get(CombatTroopClass.DISRUPTOR) ?? 0
  const legionnaire = class_counts.get(CombatTroopClass.LEGIONNAIRE) ?? 0
  const interceptor = class_counts.get(CombatTroopClass.INTERCEPTOR) ?? 0
  if (war_machine >= disruptor && war_machine >= legionnaire && war_machine >= interceptor) {
    return CombatStrategy.OPENING_STRIKE
  }
  if (disruptor >= legionnaire && disruptor >= interceptor) {
    return CombatStrategy.BALANCED
  }
  return CombatStrategy.HOLD_THE_LINE
}

export function simulateAttackCommit({
  move_troops,
  defender_stacks,
  attacker_strategy,
}: {
  move_troops: { code: TroopCode, count: number }[]
  defender_stacks: { code: TroopCode, count: number }[]
  attacker_strategy: CombatStrategy
}): BattleWinner | null {
  const defender_strategy = pickAttackerStrategyForDefender(defender_stacks)
  const result = simulateCombat({
    attacker_stacks: move_troops,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
  })
  return result.winner
}

type AttackCandidate = {
  origin: Coordinates
  destination: Coordinates
  score: number
  move_troops: { code: TroopCode; count: number }[]
  combat_strategy: CombatStrategy
}

async function defenderCombatStacksOnCell({
  cell_id,
  attacker_player_id,
}: {
  cell_id: string
  attacker_player_id: string
}): Promise<{ code: TroopCode, count: number }[]> {
  const repository = Factory.getRepository()
  const stacks = await repository.troop.listAllInCell({ cell_id })
  return stacks
    .filter(troop => troop.player_id !== attacker_player_id && troop.count > 0 && troop.movement_id === null)
    .map(troop => ({
      code: troop.code,
      count: troop.count,
    }))
}

export async function pickSystemAttack({
  player_id,
  attacker_faction_code,
  army_counts,
  blocked_targets = [],
  confederation_target_score_bonus = 0,
  tick_context,
}: {
  player_id: string
  attacker_faction_code: FactionCode
  army_counts: SystemCombatArmyCounts
  blocked_targets?: readonly SystemPlayerMemoryCoordinates[]
  confederation_target_score_bonus?: number
  tick_context?: SystemTickContext
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

    const viewport = await getWorldViewportForOrigin({
      player_id,
      origin: origin.coordinates,
      context: tick_context,
    })

    for (const cell of viewport.cells) {
      if (cell.coordinates.x === origin.coordinates.x && cell.coordinates.y === origin.coordinates.y) {
        continue
      }
      if (isCoordinatesBlocked(cell.coordinates, blocked_targets)) {
        continue
      }

      try {
        const target = await resolveAttackTarget({
          attacker_player_id: player_id,
          attacker_faction_code,
          destination: cell.coordinates,
        })
        const defender_stacks = await defenderCombatStacksOnCell({
          cell_id: target.destination_cell_id,
          attacker_player_id: player_id,
        })
        const defender_combat_count = countCombatStacks(defender_stacks)
        const combat_strategy = pickAttackerStrategyForDefender(defender_stacks)
        const winner = simulateAttackCommit({
          move_troops,
          defender_stacks,
          attacker_strategy: combat_strategy,
        })
        if (winner !== BattleWinner.ATTACKER) {
          continue
        }
        const score = scoreAttackTarget({
          target_kind: target.target_kind,
          cell,
          defender_combat_count,
          defender_faction_code: target.defender_faction_code,
          confederation_target_score_bonus,
        })
        if (!best || score > best.score) {
          best = {
            origin: origin.coordinates,
            destination: cell.coordinates,
            score,
            move_troops,
            combat_strategy,
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
