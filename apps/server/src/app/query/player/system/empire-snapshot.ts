import { projectBuildingLevelsForPolicy } from '#command/player/system/pending-upgrades'
import {
  loadEmpireCombatArmyCounts,
} from '#command/player/system/combat-policy'
import { needsOutpostLogistics } from '#command/player/system/outpost-logistics'
import {
  isCityWarehouseUnderPressure,
  isCoreProductionSatisfied,
  shouldPrioritizeEconomyForSystemPlayer,
} from '#command/player/system/storage'
import {
  isSystemCombatArmyReady,
  loadOutpostRecruitHints,
} from '#command/player/system/troops'
import {
  isExpansionStarved,
  type SystemEmpireSnapshot,
} from '#core/player/system/empire-snapshot'
import { OutpostType } from '#core/outpost/constant/type'
import {
  shouldDeferExploreForBasing,
  sortCellsByExpansionScore,
  systemExpansionBaseCellScore,
  systemExpansionScoutScore,
  systemTickExpansionCategories,
} from '#core/player/system/expansion-cell'
import type { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  WORLD_SIZE,
} from '#core/world/constant/size'
import { BuildingListQuery } from '#query/building/list'
import { CityGetQuery } from '#query/city/get'
import { CityListQuery } from '#query/city/list'
import { OutpostListQuery } from '#query/outpost/list'
import { TechnologyListQuery } from '#query/technology/list'
import { WorldGetCellsQuery } from '#query/world/get-cells'

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

function sameCoordinates(left: Coordinates, right: Coordinates): boolean {
  return left.x === right.x && left.y === right.y
}

async function computeDeferExplore({
  player_id,
  can_found_city,
  base_cell_score,
}: {
  player_id: string
  can_found_city: boolean
  base_cell_score: (cell: CellEntity) => number
}): Promise<boolean> {
  const { cities } = await new CityListQuery().run({ player_id })
  const {
    outposts,
    cells,
  } = await new OutpostListQuery().run({ player_id })

  const occupied_cell_ids = new Set<string>()
  const origins: Coordinates[] = []

  for (const city of cities) {
    const details = await new CityGetQuery().run({
      city_id: city.id,
      player_id,
    })
    occupied_cell_ids.add(details.cell.id)
    origins.push(details.cell.coordinates)
  }

  outposts.forEach((outpost, index) => {
    const cell = cells[index]
    if (!cell) {
      return
    }
    occupied_cell_ids.add(cell.id)
    origins.push(cell.coordinates)
  })

  let best_base_score: number | null = null
  let best_unexplored_scout_score: number | null = null

  for (const origin of origins) {
    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin),
    })
    const explored = new Set(viewport.explored_cell_ids)
    const base_candidates = viewport.cells.filter(cell => explored.has(cell.id)
      && !occupied_cell_ids.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin))
    const best_base = sortCellsByExpansionScore({
      cells: base_candidates,
      score: base_cell_score,
    })[0]
    if (best_base) {
      const score = base_cell_score(best_base)
      best_base_score = best_base_score === null ? score : Math.max(best_base_score, score)
    }

    const unexplored = viewport.cells.filter(cell => !explored.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin))
    const best_unexplored = sortCellsByExpansionScore({
      cells: unexplored,
      score: systemExpansionScoutScore,
    })[0]
    if (best_unexplored) {
      const score = systemExpansionScoutScore(best_unexplored)
      best_unexplored_scout_score = best_unexplored_scout_score === null
        ? score
        : Math.max(best_unexplored_scout_score, score)
    }
  }

  return shouldDeferExploreForBasing({
    best_base_score,
    best_unexplored_scout_score,
    can_found_city,
  })
}

async function isProductionReadyForResearch(player_id: string): Promise<boolean> {
  const { cities } = await new CityListQuery().run({ player_id })
  const city = cities[0]
  if (!city) {
    return false
  }

  const [
    city_details,
    building_list,
    { research_queue },
  ] = await Promise.all([
    new CityGetQuery().run({
      city_id: city.id,
      player_id,
    }),
    new BuildingListQuery().run({
      city_id: city.id,
      player_id,
    }),
    new TechnologyListQuery().run({ player_id }),
  ])

  const projected_buildings = projectBuildingLevelsForPolicy({
    buildings: building_list.buildings,
    upgrade_queue: building_list.upgrade_queue,
  })

  if (!isCoreProductionSatisfied(projected_buildings)) {
    return false
  }
  if (city_details.production_energy_ratio < 1) {
    return false
  }
  if (isCityWarehouseUnderPressure({
    resource_stock: city_details.resource_stock,
    warehouses_capacity: city_details.warehouses_capacity,
  })) {
    return false
  }

  void research_queue
  return true
}

export async function collectSystemEmpireSnapshot(player_id: string): Promise<SystemEmpireSnapshot> {
  const [
    { cities, count_limit: city_count_limit },
    { outposts },
    combat_counts,
    outpost_recruit_hints,
  ] = await Promise.all([
    new CityListQuery().run({ player_id }),
    new OutpostListQuery().run({ player_id }),
    loadEmpireCombatArmyCounts(player_id),
    loadOutpostRecruitHints(player_id),
  ])

  const temporary_outpost_count = outposts.filter(
    outpost => outpost.type !== OutpostType.PERMANENT,
  ).length
  const permanent_outpost_count = outposts.filter(
    outpost => outpost.type === OutpostType.PERMANENT,
  ).length
  const expansion_categories = systemTickExpansionCategories({
    temporary_outpost_count,
  })

  const main_city = cities[0]
  let economy_first = true
  if (main_city) {
    const [
      city_details,
      building_list,
    ] = await Promise.all([
      new CityGetQuery().run({
        city_id: main_city.id,
        player_id,
      }),
      new BuildingListQuery().run({
        city_id: main_city.id,
        player_id,
      }),
    ])
    economy_first = shouldPrioritizeEconomyForSystemPlayer({
      production_energy_ratio: city_details.production_energy_ratio,
      resource_stock: city_details.resource_stock,
      warehouses_capacity: city_details.warehouses_capacity,
      buildings: building_list.buildings,
    })
  }

  const can_found_city = cities.length < city_count_limit
  const base_cell_score = systemExpansionBaseCellScore({ can_found_city })

  const [
    production_ready_for_research,
    defer_explore,
  ] = await Promise.all([
    isProductionReadyForResearch(player_id),
    computeDeferExplore({
      player_id,
      can_found_city,
      base_cell_score,
    }),
  ])

  const expansion_starved = isExpansionStarved({
    temporary_outpost_count,
    permanent_outpost_count,
    defer_explore,
  })

  const needs_outpost_logistics = permanent_outpost_count > 0 && needsOutpostLogistics({
    needs_harvester_on_outpost: outpost_recruit_hints.needs_harvester_on_outpost,
    needs_reclaimer_on_outpost: outpost_recruit_hints.needs_reclaimer_on_outpost,
    needs_carrier_on_outpost: outpost_recruit_hints.needs_carrier_on_outpost,
  })

  return {
    player_id,
    temporary_outpost_count,
    permanent_outpost_count,
    expansion_categories,
    economy_first,
    production_ready_for_research,
    defer_explore,
    expansion_starved,
    combat_army_ready: isSystemCombatArmyReady(combat_counts),
    needs_outpost_logistics,
  }
}
