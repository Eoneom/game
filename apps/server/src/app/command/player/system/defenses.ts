import { Factory } from '#adapter/factory'
import { buildDefense } from '#app/command/defense/build'
import { BuildingListQuery } from '#query/building/list'
import { CityGetQuery } from '#query/city/get'
import { DefenseListQuery } from '#query/defense/list'
import type { TechnologyListEntry } from '#query/technology/list'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { defense_characteristics } from '#core/defense/constant/characteristic'
import {
  RequirementService,
  type Levels
} from '#core/requirement/service'
import type { SystemAiProfile } from '#core/player/system/ai-profile'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'

/** A city counts as "attacked recently" for minefields when it was a battle target within this window. */
const SYSTEM_DEFENSE_RECENT_ATTACK_WINDOW_MS = 6 * 60 * 60 * 1000

/** Share of the city stock the AI may spend on one fortification batch. */
const SYSTEM_DEFENSE_STOCK_SHARE = 0.5

/** Minefields built per batch once the rampart / turret mix is in place. */
const SYSTEM_MINEFIELD_BATCH = 10

type SystemDefenseBuild = {
  code: DefenseCode
  count: number
}

function meetsDefenseRequirement(defense_code: DefenseCode, levels: Levels): boolean {
  try {
    RequirementService.checkDefenseRequirement({
      defense_code,
      levels
    })
    return true
  } catch {
    return false
  }
}

function affordableCount({
  stock,
  unit_cost,
}: {
  stock: Resource
  unit_cost: Resource
}): number {
  const budget = (key: keyof Resource): number => unit_cost[key] > 0
    ? Math.floor((stock[key] * SYSTEM_DEFENSE_STOCK_SHARE) / unit_cost[key])
    : Number.POSITIVE_INFINITY
  return Math.max(0, Math.min(budget('plastic'), budget('mushroom'), budget('plasma'), budget('water')))
}

/**
 * Slice 029 policy for one city: fill up to `fill_ratio` of the defense capacity with ramparts and turrets
 * in a 1 : 1 point ratio (each type aims at half the target), then minefields when capacity is left and the
 * city was attacked recently. Plasma batteries and shields are not built by the AI.
 */
export function planSystemDefenseBuild({
  capacity,
  queued_points,
  defenses,
  fill_ratio,
  attacked_recently,
  levels,
  stock,
  unit_costs,
}: {
  capacity: number
  queued_points: number
  defenses: { code: DefenseCode, count: number }[]
  fill_ratio: number
  attacked_recently: boolean
  levels: Levels
  stock: Resource
  unit_costs: Record<DefenseCode, Resource>
}): SystemDefenseBuild | null {
  const points_of = (code: DefenseCode): number => {
    const count = defenses.find(defense => defense.code === code)?.count ?? 0
    return count * defense_characteristics[code].points
  }
  const used_points = defenses.reduce((sum, defense) => sum + defense.count * defense_characteristics[defense.code].points, 0)
  const free_points = capacity - used_points - queued_points
  if (free_points <= 0) {
    return null
  }

  const target_points = Math.floor(capacity * fill_ratio)
  const share_points = target_points / 2
  const mix_points = points_of(DefenseCode.RAMPART) + points_of(DefenseCode.TURRET) + queued_points

  const candidates: { code: DefenseCode, deficit_points: number }[] = []
  if (mix_points < target_points) {
    candidates.push(
      {
        code: DefenseCode.RAMPART,
        deficit_points: share_points - points_of(DefenseCode.RAMPART),
      },
      {
        code: DefenseCode.TURRET,
        deficit_points: share_points - points_of(DefenseCode.TURRET),
      },
    )
  } else if (attacked_recently) {
    candidates.push({
      code: DefenseCode.MINEFIELD,
      deficit_points: Math.min(free_points, SYSTEM_MINEFIELD_BATCH * defense_characteristics[DefenseCode.MINEFIELD].points),
    })
  }

  const sorted = candidates
    .filter(candidate => candidate.deficit_points > 0 && meetsDefenseRequirement(candidate.code, levels))
    .sort((a, b) => b.deficit_points - a.deficit_points)

  for (const candidate of sorted) {
    const points = defense_characteristics[candidate.code].points
    const room_points = candidate.code === DefenseCode.MINEFIELD
      ? free_points
      : Math.min(free_points, target_points - mix_points)
    const count = Math.min(
      Math.ceil(candidate.deficit_points / points),
      Math.floor(room_points / points),
      affordableCount({
        stock,
        unit_cost: unit_costs[candidate.code],
      }),
    )
    if (count >= 1) {
      return {
        code: candidate.code,
        count,
      }
    }
  }

  return null
}

function levelsFor({
  buildings,
  technologies,
}: {
  buildings: { code: BuildingCode, level: number }[]
  technologies: TechnologyListEntry[]
}): Levels {
  return {
    building: Object.fromEntries(buildings.map(building => [
      building.code,
      building.level 
    ])),
    technology: Object.fromEntries(technologies.map(technology => [
      technology.code,
      technology.level 
    ])),
  }
}

/** Starts one fortification batch per city that has an Enceinte and no batch running (the AI does not queue). */
export async function tryBuildSystemDefenses({
  player_id,
  cities,
  technologies,
  ai_profile,
}: {
  player_id: string
  cities: { id: string, name: string }[]
  technologies: TechnologyListEntry[]
  ai_profile: SystemAiProfile
}): Promise<(SystemDefenseBuild & { city_id: string, city_name: string })[]> {
  const builds: (SystemDefenseBuild & { city_id: string, city_name: string })[] = []

  for (const city of cities) {
    const { buildings } = await new BuildingListQuery().run({
      city_id: city.id,
      player_id,
    })
    const city_wall_level = buildings.find(building => building.code === BuildingCode.CITY_WALL)?.level ?? 0
    if (city_wall_level < 1) {
      continue
    }

    const defense_list = await new DefenseListQuery().run({
      city_id: city.id,
      player_id,
    })
    if (defense_list.pending_build) {
      continue
    }

    const [
      city_details,
      recent_battles,
    ] = await Promise.all([
      new CityGetQuery().run({
        city_id: city.id,
        player_id,
      }),
      Factory.getRepository().battle.countByTargetSince({
        target_id: city.id,
        since: now() - SYSTEM_DEFENSE_RECENT_ATTACK_WINDOW_MS,
      }),
    ])

    const plan = planSystemDefenseBuild({
      capacity: defense_list.capacity.total,
      queued_points: defense_list.capacity.queued,
      defenses: defense_list.defenses,
      fill_ratio: ai_profile.defense_fill_ratio,
      attacked_recently: recent_battles > 0,
      levels: levelsFor({
        buildings,
        technologies,
      }),
      stock: city_details.resource_stock,
      unit_costs: Object.fromEntries(Object.values(DefenseCode).map(code => [
        code,
        defense_list.costs[code].resource 
      ])) as Record<DefenseCode, Resource>,
    })
    if (!plan) {
      continue
    }

    await buildDefense({
      player_id,
      city_id: city.id,
      defense_code: plan.code,
      count: plan.count,
    })
    builds.push({
      ...plan,
      city_id: city.id,
      city_name: city.name,
    })
  }

  return builds
}
