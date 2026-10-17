import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import { OutpostType } from '#core/outpost/constant/type'
import { TroopCode } from '#core/troop/constant/code'
import { troop_role, TroopRole } from '#core/troop/constant/role'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { Resource } from '#shared/resource'

/** Per-city cap on scout-role troops garrisoned in that city (e.g. Seeker). */
export const SYSTEM_MAX_SCOUT_TROOPS = 2
/** Per-city cap on founder-role troops garrisoned in that city (e.g. Assembler). */
export const SYSTEM_MAX_FOUNDER_TROOPS = 1

const ECONOMY_ROLES = new Set([
  TroopRole.CULTIVATOR,
  TroopRole.SALVAGER,
  TroopRole.CARRIER,
])

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
}

export type SystemRecruitSortHints = SystemOutpostRecruitHints & {
  scout_count: number
  founder_count: number
}

export function recruitSortHintsForCity({
  city_troops,
  outpost_hints,
}: {
  city_troops: TroopEntity[]
  outpost_hints: SystemOutpostRecruitHints
}): SystemRecruitSortHints {
  return {
    scout_count: countRole(city_troops, TroopRole.SCOUT),
    founder_count: countRole(city_troops, TroopRole.FOUNDER),
    needs_harvester_on_outpost: outpost_hints.needs_harvester_on_outpost,
    needs_reclaimer_on_outpost: outpost_hints.needs_reclaimer_on_outpost,
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

  if (role === TroopRole.CULTIVATOR && hints.needs_harvester_on_outpost) {
    return 0
  }
  if (role === TroopRole.SALVAGER && hints.needs_reclaimer_on_outpost) {
    return 0
  }

  if (ECONOMY_ROLES.has(role)) {
    return 10 + TroopService.getOrder(code)
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
  const {
    outposts,
    resource_stocks,
  } = await new OutpostListQuery().run({ player_id })

  let needs_harvester_on_outpost = false
  let needs_reclaimer_on_outpost = false

  for (const [
    index,
    outpost,
  ] of outposts.entries()) {
    if (outpost.type !== OutpostType.PERMANENT) {
      continue
    }
    const stock = resource_stocks[index]
    if (!stock || !hasStock(stock)) {
      continue
    }

    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })
    const harvester = TroopService.findByRole({
      troops,
      role: TroopRole.CULTIVATOR,
    })
    const reclaimer = TroopService.findByRole({
      troops,
      role: TroopRole.SALVAGER,
    })
    if (!harvester || harvester.count < 1) {
      needs_harvester_on_outpost = true
    }
    if (!reclaimer || reclaimer.count < 1) {
      needs_reclaimer_on_outpost = true
    }
  }

  return {
    needs_harvester_on_outpost,
    needs_reclaimer_on_outpost,
  }
}
