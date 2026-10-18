import { AppService } from '#app/service'
import {
  buildOutpostDeployCandidate,
  outpostNeedsCarrier,
} from '#command/player/system/outpost-logistics'
import { resourceFromStockRow } from '#command/player/system/transport'
import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import { OutpostType } from '#core/outpost/constant/type'
import { TroopCode } from '#core/troop/constant/code'
import { troop_role, TroopRole } from '#core/troop/constant/role'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { combatRoleFor, combatTroopClassFor } from '#core/combat/troop-combat'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { CombatRole } from '#core/troop/constant/combat-role'
import { Resource } from '#shared/resource'

/** Per-city cap on scout-role troops garrisoned in that city (e.g. Seeker). */
export const SYSTEM_MAX_SCOUT_TROOPS = 2
/** Per-city cap on founder-role troops garrisoned in that city (e.g. Assembler). */
export const SYSTEM_MAX_FOUNDER_TROOPS = 1

const ECONOMY_ROLES = new Set([ TroopRole.CARRIER ])
export const SYSTEM_TARGET_WAR_MACHINE = 20
export const SYSTEM_MIN_LEGIONNAIRE_CLASS = 5
export const SYSTEM_MIN_INTERCEPTOR_CLASS = 5
export const SYSTEM_DISRUPTOR_RATIO = 0.3

export type SystemCombatArmyCounts = {
  war_machine: number
  disruptor: number
  legionnaire: number
  interceptor: number
  total_combat: number
}

export function emptySystemCombatArmyCounts(): SystemCombatArmyCounts {
  return {
    war_machine: 0,
    disruptor: 0,
    legionnaire: 0,
    interceptor: 0,
    total_combat: 0,
  }
}

export function accumulateCombatArmyCounts(
  counts: SystemCombatArmyCounts,
  troops: TroopEntity[],
): SystemCombatArmyCounts {
  for (const troop of troops) {
    if (troop.count <= 0 || combatRoleFor(troop.code) !== CombatRole.COMBAT) {
      continue
    }
    counts.total_combat += troop.count
    const combat_class = combatTroopClassFor(troop.code)
    switch (combat_class) {
    case CombatTroopClass.WAR_MACHINE:
      counts.war_machine += troop.count
      break
    case CombatTroopClass.DISRUPTOR:
      counts.disruptor += troop.count
      break
    case CombatTroopClass.LEGIONNAIRE:
      counts.legionnaire += troop.count
      break
    case CombatTroopClass.INTERCEPTOR:
      counts.interceptor += troop.count
      break
    default:
      break
    }
  }
  return counts
}

function hasStock(stock: Resource): boolean {
  return stock.plastic + stock.mushroom + stock.plasma > 0
}

function countRole(troops: TroopEntity[], role: TroopRole): number {
  return troops
    .filter(troop => troop_role[troop.code] === role)
    .reduce((sum, troop) => sum + troop.count, 0)
}

export type SystemOutpostRecruitHints = {
  needs_harvester_on_outpost: boolean
  needs_reclaimer_on_outpost: boolean
  needs_carrier_on_outpost: boolean
  /** At least one permanent outpost on a cell that can gather mushroom (cultivator). */
  has_harvester_outpost: boolean
  /** At least one permanent outpost on a cell that can gather plastic (salvager). */
  has_reclaimer_outpost: boolean
}

export type SystemCombatRecruitHints = {
  army_counts: SystemCombatArmyCounts
  boost_combat_recruit: boolean
}

export type SystemRecruitSortHints = SystemOutpostRecruitHints & {
  scout_count: number
  founder_count: number
  combat: SystemCombatRecruitHints
}

export function scoreCityForEmpireRecruit({
  city_index,
  hints,
  needs_logistics_troop_in_city,
}: {
  city_index: number
  hints: SystemRecruitSortHints
  needs_logistics_troop_in_city: boolean
}): number {
  let score = city_index * 3
  if (hints.combat.boost_combat_recruit) {
    score -= 20
  }
  if (hints.needs_harvester_on_outpost || hints.needs_reclaimer_on_outpost || hints.needs_carrier_on_outpost) {
    score -= needs_logistics_troop_in_city ? 25 : 5
  }
  if (hints.scout_count < SYSTEM_MAX_SCOUT_TROOPS) {
    score -= 2
  }
  return score
}

export function recruitSortHintsForCity({
  city_troops,
  outpost_hints,
  combat,
}: {
  city_troops: TroopEntity[]
  outpost_hints: SystemOutpostRecruitHints
  combat: SystemCombatRecruitHints
}): SystemRecruitSortHints {
  return {
    scout_count: countRole(city_troops, TroopRole.SCOUT),
    founder_count: countRole(city_troops, TroopRole.FOUNDER),
    needs_harvester_on_outpost: outpost_hints.needs_harvester_on_outpost,
    needs_reclaimer_on_outpost: outpost_hints.needs_reclaimer_on_outpost,
    needs_carrier_on_outpost: outpost_hints.needs_carrier_on_outpost,
    has_harvester_outpost: outpost_hints.has_harvester_outpost,
    has_reclaimer_outpost: outpost_hints.has_reclaimer_outpost,
    combat,
  }
}

function minimumDisruptorForArmy(total_combat: number): number {
  if (total_combat <= 0) {
    return 0
  }
  return Math.ceil(total_combat * SYSTEM_DISRUPTOR_RATIO)
}

export function isSystemCombatArmyReady(counts: SystemCombatArmyCounts): boolean {
  if (counts.war_machine < SYSTEM_TARGET_WAR_MACHINE) {
    return false
  }
  if (counts.legionnaire < SYSTEM_MIN_LEGIONNAIRE_CLASS) {
    return false
  }
  if (counts.interceptor < SYSTEM_MIN_INTERCEPTOR_CLASS) {
    return false
  }
  return counts.disruptor >= minimumDisruptorForArmy(counts.total_combat)
}

function combatClassRecruitBoostPriority({
  code,
  army_counts,
}: {
  code: TroopCode
  army_counts: SystemCombatArmyCounts
}): number | null {
  if (combatRoleFor(code) !== CombatRole.COMBAT) {
    return null
  }
  const combat_class = combatTroopClassFor(code)
  if (!combat_class) {
    return null
  }
  if (
    combat_class === CombatTroopClass.WAR_MACHINE
    && army_counts.war_machine < SYSTEM_TARGET_WAR_MACHINE
  ) {
    return 0
  }
  if (
    combat_class === CombatTroopClass.LEGIONNAIRE
    && army_counts.legionnaire < SYSTEM_MIN_LEGIONNAIRE_CLASS
  ) {
    return 1
  }
  if (
    combat_class === CombatTroopClass.INTERCEPTOR
    && army_counts.interceptor < SYSTEM_MIN_INTERCEPTOR_CLASS
  ) {
    return 2
  }
  const min_disruptor = minimumDisruptorForArmy(army_counts.total_combat)
  if (combat_class === CombatTroopClass.DISRUPTOR && army_counts.disruptor < min_disruptor) {
    return 3
  }
  return null
}

export function shouldBoostCombatRecruit({
  army_counts,
  has_city,
  main_city_stock,
}: {
  army_counts: SystemCombatArmyCounts
  has_city: boolean
  main_city_stock: Resource
}): boolean {
  if (!has_city || !hasStock(main_city_stock)) {
    return false
  }
  return !isSystemCombatArmyReady(army_counts)
}

export function combatRecruitHints({
  army_counts,
  has_city,
  main_city_stock,
}: {
  army_counts: SystemCombatArmyCounts
  has_city: boolean
  main_city_stock: Resource
}): SystemCombatRecruitHints {
  return {
    army_counts,
    boost_combat_recruit: shouldBoostCombatRecruit({
      army_counts,
      has_city,
      main_city_stock,
    }),
  }
}

function recruitPriority({
  code,
  hints,
}: {
  code: TroopCode
  hints: SystemRecruitSortHints
}): number {
  const role = troop_role[code]
  const scout_capped = hints.scout_count >= SYSTEM_MAX_SCOUT_TROOPS
  const founder_capped = hints.founder_count >= SYSTEM_MAX_FOUNDER_TROOPS

  if (role === TroopRole.SCOUT && scout_capped) {
    return 1000 + TroopService.getOrder(code)
  }
  if (role === TroopRole.FOUNDER && founder_capped) {
    return 1000 + TroopService.getOrder(code)
  }

  if (role === TroopRole.CULTIVATOR) {
    if (!hints.has_harvester_outpost || !hints.needs_harvester_on_outpost) {
      return 1000 + TroopService.getOrder(code)
    }
    return 0
  }
  if (role === TroopRole.SALVAGER) {
    if (!hints.has_reclaimer_outpost || !hints.needs_reclaimer_on_outpost) {
      return 1000 + TroopService.getOrder(code)
    }
    return 0
  }

  if (role === TroopRole.CARRIER) {
    if (hints.needs_carrier_on_outpost) {
      return 1 + TroopService.getOrder(code)
    }
    if (ECONOMY_ROLES.has(role)) {
      return 10 + TroopService.getOrder(code)
    }
  }

  if (ECONOMY_ROLES.has(role)) {
    return 10 + TroopService.getOrder(code)
  }

  if (hints.combat.boost_combat_recruit) {
    const boost = combatClassRecruitBoostPriority({
      code,
      army_counts: hints.combat.army_counts,
    })
    if (boost !== null) {
      return boost + TroopService.getOrder(code)
    }
    if (combatRoleFor(code) === CombatRole.COMBAT) {
      return 4 + TroopService.getOrder(code)
    }
  }

  if (role === TroopRole.SCOUT || role === TroopRole.FOUNDER) {
    return 100 + TroopService.getOrder(code)
  }

  return 50 + TroopService.getOrder(code)
}

export function sortTroopsForSystemRecruit({
  troops,
  hints,
}: {
  troops: TroopEntity[]
  hints: SystemRecruitSortHints
}): TroopEntity[] {
  return [ ...troops ].sort((a, b) => {
    const priority_diff = recruitPriority({
      code: a.code,
      hints
    }) - recruitPriority({
      code: b.code,
      hints
    })
    if (priority_diff !== 0) {
      return priority_diff
    }
    return TroopService.getOrder(a.code) - TroopService.getOrder(b.code)
  })
}

function maxAffordableRecruitCount(stock: Resource, unit_cost: Resource): number {
  const limits: number[] = []
  if (unit_cost.plastic > 0) {
    limits.push(Math.floor(stock.plastic / unit_cost.plastic))
  }
  if (unit_cost.mushroom > 0) {
    limits.push(Math.floor(stock.mushroom / unit_cost.mushroom))
  }
  if (unit_cost.plasma > 0) {
    limits.push(Math.floor(stock.plasma / unit_cost.plasma))
  }
  if (limits.length === 0) {
    return Number.MAX_SAFE_INTEGER
  }
  return Math.min(...limits)
}

export function maxRoleRecruitHeadroom(
  role: TroopRole,
  hints: Pick<SystemRecruitSortHints, 'scout_count' | 'founder_count'>
): number {
  if (role === TroopRole.SCOUT) {
    return Math.max(0, SYSTEM_MAX_SCOUT_TROOPS - hints.scout_count)
  }
  if (role === TroopRole.FOUNDER) {
    return Math.max(0, SYSTEM_MAX_FOUNDER_TROOPS - hints.founder_count)
  }
  return Number.MAX_SAFE_INTEGER
}

/** How many of `troop_code` the system player may start recruiting in one job for this city. */
export function systemRecruitBatchCount({
  troop_code,
  stock,
  unit_cost,
  hints,
}: {
  troop_code: TroopCode
  stock: Resource
  unit_cost: Resource
  hints: SystemRecruitSortHints
}): number {
  const role = troop_role[troop_code]
  if (role === TroopRole.CULTIVATOR) {
    if (!hints.has_harvester_outpost || !hints.needs_harvester_on_outpost) {
      return 0
    }
  }
  if (role === TroopRole.SALVAGER) {
    if (!hints.has_reclaimer_outpost || !hints.needs_reclaimer_on_outpost) {
      return 0
    }
  }
  const headroom = maxRoleRecruitHeadroom(role, hints)
  if (headroom === 0) {
    return 0
  }
  const affordable = maxAffordableRecruitCount(stock, unit_cost)
  if (affordable < 1) {
    return 0
  }
  return Math.min(affordable, headroom)
}

export async function loadOutpostRecruitHints(player_id: string): Promise<SystemOutpostRecruitHints> {
  const [
    {
      outposts,
      cells,
      resource_stocks,
    },
    outpost_warehouses_capacity,
  ] = await Promise.all([
    new OutpostListQuery().run({ player_id }),
    AppService.getOutpostWarehousesCapacity({ player_id }),
  ])

  let needs_harvester_on_outpost = false
  let needs_reclaimer_on_outpost = false
  let needs_carrier_on_outpost = false
  let has_harvester_outpost = false
  let has_reclaimer_outpost = false

  for (const [
    index,
    outpost,
  ] of outposts.entries()) {
    if (outpost.type !== OutpostType.PERMANENT) {
      continue
    }
    const cell = cells[index]
    if (!cell) {
      continue
    }
    const stock = resourceFromStockRow(resource_stocks[index])

    if (cell.resource_coefficient.mushroom > 0) {
      has_harvester_outpost = true
    }
    if (cell.resource_coefficient.plastic > 0) {
      has_reclaimer_outpost = true
    }

    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })

    const candidate = buildOutpostDeployCandidate({
      outpost,
      cell,
      stock,
      troops,
      warehouses_capacity: outpost_warehouses_capacity,
    })
    if (!candidate) {
      continue
    }
    if (candidate.missing_roles.includes(TroopRole.CULTIVATOR)) {
      needs_harvester_on_outpost = true
    }
    if (candidate.missing_roles.includes(TroopRole.SALVAGER)) {
      needs_reclaimer_on_outpost = true
    }
    if (candidate.missing_roles.includes(TroopRole.CARRIER)) {
      needs_carrier_on_outpost = true
    }
  }

  return {
    needs_harvester_on_outpost,
    needs_reclaimer_on_outpost,
    needs_carrier_on_outpost,
    has_harvester_outpost,
    has_reclaimer_outpost,
  }
}
