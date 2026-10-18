import { projectBuildingLevelsForPolicy } from '#command/player/system/pending-upgrades'
import {
  loadEmpireCombatArmyCounts,
} from '#command/player/system/combat-policy'
import {
  needsOutpostLogistics,
  outpostLogisticsPhase,
  SystemOutpostLogisticsPhase,
} from '#command/player/system/outpost-logistics'
import { loadSystemPlayerMemory } from '#command/player/system/memory'
import { collectSystemEmpireIntel } from '#app/query/player/system/empire-intel'
import { summarizeSystemFrontierQueue } from '#app/query/player/system/frontier-queue'
import { isEmpireUnderThreat } from '#core/player/system/intel'
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
import { AppService } from '#app/service'
import {
  countPermanentOutpostsWorthTransport,
  resourceFromStockRow,
} from '#command/player/system/transport'
import { countSettleReadyTemporaryOutposts } from '#command/player/system/settle-candidates'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostService } from '#core/outpost/service'
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
import { TroopListQuery } from '#query/troop/list'
import { BuildingListQuery } from '#query/building/list'
import { CityGetQuery } from '#query/city/get'
import { CityListQuery } from '#query/city/list'
import { OutpostListQuery } from '#query/outpost/list'
import { TechnologyListQuery } from '#query/technology/list'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { Factory } from '#adapter/factory'
import { resolveSystemAiProfile } from '#core/player/system/ai-profile'

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
  const player = await Factory.getRepository().player.get(player_id)
  const ai_profile = resolveSystemAiProfile({
    player_name: player.name,
    faction_code: player.faction_code,
  })
  const [
    { cities, count_limit: city_count_limit },
    outpost_list,
    combat_counts,
    outpost_recruit_hints,
    outpost_warehouses_capacity,
  ] = await Promise.all([
    new CityListQuery().run({ player_id }),
    new OutpostListQuery().run({ player_id }),
    loadEmpireCombatArmyCounts(player_id),
    loadOutpostRecruitHints(player_id),
    AppService.getOutpostWarehousesCapacity({ player_id }),
  ])
  const { outposts, resource_stocks } = outpost_list

  const temporary_outpost_count = outposts.filter(
    outpost => outpost.type !== OutpostType.PERMANENT,
  ).length
  const permanent_outpost_count = outposts.filter(
    outpost => outpost.type === OutpostType.PERMANENT,
  ).length
  const outpost_limit_reached = OutpostService.isLimitReached({
    existing_outposts_count: outposts.length,
  })
  const expansion_categories = systemTickExpansionCategories({
    temporary_outpost_count,
  })

  const main_city = cities[0]
  let economy_first = true
  let city_warehouse_under_pressure = false
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
    city_warehouse_under_pressure = isCityWarehouseUnderPressure({
      resource_stock: city_details.resource_stock,
      warehouses_capacity: city_details.warehouses_capacity,
    })
    economy_first = shouldPrioritizeEconomyForSystemPlayer({
      production_energy_ratio: city_details.production_energy_ratio,
      resource_stock: city_details.resource_stock,
      warehouses_capacity: city_details.warehouses_capacity,
      buildings: building_list.buildings,
    })
  }

  const can_found_city = cities.length < city_count_limit
  const settle_ready_temp_count = can_found_city
    ? await countSettleReadyTemporaryOutposts(player_id)
    : 0
  const base_cell_score = systemExpansionBaseCellScore({ can_found_city })

  const [
    production_ready_for_research,
    defer_explore,
  ] = await Promise.all([
    isProductionReadyForResearch(player_id),
    outpost_limit_reached
      ? Promise.resolve(false)
      : computeDeferExplore({
        player_id,
        can_found_city,
        base_cell_score,
      }),
  ])

  const needs_outpost_logistics = permanent_outpost_count > 0 && needsOutpostLogistics({
    needs_harvester_on_outpost: outpost_recruit_hints.needs_harvester_on_outpost,
    needs_reclaimer_on_outpost: outpost_recruit_hints.needs_reclaimer_on_outpost,
    needs_carrier_on_outpost: outpost_recruit_hints.needs_carrier_on_outpost,
  })

  const persisted_outpost_stocks = resource_stocks.map(stock_row => resourceFromStockRow(stock_row))
  const outpost_transport_pressure_count = countPermanentOutpostsWorthTransport({
    outposts,
    resource_stocks: persisted_outpost_stocks,
    warehouses_capacity: outpost_warehouses_capacity,
  })

  const owned_coordinates: Coordinates[] = []
  for (const city of cities) {
    const details = await new CityGetQuery().run({
      city_id: city.id,
      player_id,
    })
    owned_coordinates.push(details.cell.coordinates)
  }
  outpost_list.cells.forEach((cell) => {
    if (cell) {
      owned_coordinates.push(cell.coordinates)
    }
  })

  let outpost_logistics_needs_gatherer_count = 0
  let outpost_logistics_needs_haul_count = 0
  for (const [
    index,
    outpost,
  ] of outposts.entries()) {
    if (outpost.type !== OutpostType.PERMANENT) {
      continue
    }
    const cell = outpost_list.cells[index]
    const stock = resource_stocks[index]
    if (!cell || !stock) {
      continue
    }
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })
    const phase = outpostLogisticsPhase({
      cell,
      troops,
      stock,
      warehouses_capacity: outpost_warehouses_capacity,
    })
    if (phase === SystemOutpostLogisticsPhase.NEEDS_GATHERER) {
      outpost_logistics_needs_gatherer_count += 1
    }
    if (phase === SystemOutpostLogisticsPhase.NEEDS_HAUL) {
      outpost_logistics_needs_haul_count += 1
    }
  }

  const [
    { frontier_queue_length, frontier_top_score },
    intel,
    memory,
  ] = await Promise.all([
    summarizeSystemFrontierQueue(player_id),
    collectSystemEmpireIntel({
      player_id,
      owned_coordinates,
    }),
    loadSystemPlayerMemory(player_id),
  ])

  const effective_defer_explore = defer_explore || frontier_queue_length > 0
  const expansion_starved = isExpansionStarved({
    temporary_outpost_count,
    permanent_outpost_count,
    defer_explore: effective_defer_explore,
    outpost_limit_reached,
  })
  const empire_under_threat = isEmpireUnderThreat(intel)

  return {
    player_id,
    temporary_outpost_count,
    permanent_outpost_count,
    expansion_categories,
    economy_first,
    production_ready_for_research,
    defer_explore: effective_defer_explore,
    expansion_starved,
    combat_army_ready: isSystemCombatArmyReady(combat_counts),
    needs_outpost_logistics,
    outpost_transport_pressure_count,
    city_warehouse_under_pressure,
    can_found_city,
    settle_ready_temp_count,
    outpost_limit_reached,
    frontier_queue_length,
    frontier_top_score,
    intel,
    empire_under_threat,
    visible_enemy_combat_stacks: intel.visible_enemy_combat_stacks,
    outpost_logistics_needs_gatherer_count,
    outpost_logistics_needs_haul_count,
    memory,
    ai_profile,
  }
}
