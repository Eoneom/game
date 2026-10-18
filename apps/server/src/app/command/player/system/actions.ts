import { upgradeBuilding } from '#app/command/building/upgrade'
import { citySettle } from '#app/command/city/settle'
import { outpostSetPermanent } from '#app/command/outpost/set-permanent'
import { researchTechnology } from '#app/command/technology/research'
import { recruitTroop } from '#app/command/troop/recruit'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { BuildingListQuery } from '#query/building/list'
import { BuildingGetQuery } from '#query/building/get'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { TechnologyListQuery } from '#query/technology/list'
import { TechnologyGetQuery } from '#query/technology/get'
import { TroopListQuery } from '#query/troop/list'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { BUILDING_UPGRADE_QUEUE_LIMIT } from '#core/building/constant/upgrade-queue'
import { RESEARCH_QUEUE_LIMIT } from '#core/technology/constant/research-queue'
import { BuildingCode } from '#core/building/constant/code'
import { nextSystemCityName } from '#core/player/constant/system'
import { OutpostType } from '#core/outpost/constant/type'
import { Factory } from '#adapter/factory'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopCode } from '#core/troop/constant/code'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  WORLD_SIZE
} from '#core/world/constant/size'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import {
  shouldDeferExploreForBasing,
  sortCellsByExpansionScore,
  systemExpansionBaseCellScore,
  systemExpansionCitySiteScore,
  systemExpansionScoutScore,
} from '#core/player/system/expansion-cell'
import { Resource } from '#shared/resource'
import type {
  SystemTickAction,
  SystemTickCategory,
} from '#command/player/system/policy'
import {
  hasPendingBuildingUpgrade,
  hasPendingTechnologyResearch,
  hasPendingTechnologyResearchByCode,
  projectBuildingLevelsForPolicy,
  projectTechnologyLevelsForPolicy,
  projectWarehousesCapacity,
} from '#command/player/system/pending-upgrades'
import {
  resourcesForTransportToDestination,
  shouldSystemUpgradeSolarPanel,
  sortBuildingsForSystemUpgrade,
} from '#command/player/system/storage'
import {
  loadEmpireCombatArmyCounts,
  pickSystemAttack,
  SYSTEM_ATTACK_COMBAT_STRATEGY,
} from '#command/player/system/combat-policy'
import {
  combatRecruitHints,
  isSystemCombatArmyReady,
  loadOutpostRecruitHints,
  recruitSortHintsForCity,
  sortTroopsForSystemRecruit,
  systemRecruitBatchCount,
} from '#command/player/system/troops'
import { selectTroopsForSystemBase } from '#core/player/system/base-troops'
import { sortTechnologiesForSystemResearch } from '#command/player/system/technologies'
import {
  levelsForSystemRequirementGate,
  meetsBuildingUpgradeRequirement,
  meetsTechnologyResearchRequirement,
  meetsTroopRecruitRequirement,
} from '#command/player/system/requirements'
import { AppService } from '#app/service'
import {
  buildOutpostDeployCandidate,
  sortOutpostDeployCandidates,
  type SystemOutpostDeployRole,
} from '#command/player/system/outpost-logistics'
import {
  carrierTroopsForTransportLoad,
  clampResourcesToTransportCapacity,
  hasTransportableStock,
  isPermanentOutpostStockWorthTransport,
  pickCityForSystemTransport,
  sortOutpostsForSystemTransport,
  SYSTEM_OUTPOST_TRANSPORT_PRESSURE_FILL_RATIO,
} from '#command/player/system/transport'

function canAfford(stock: Resource, cost: Resource): boolean {
  return stock.plastic >= cost.plastic
    && stock.mushroom >= cost.mushroom
    && stock.plasma >= cost.plasma
}

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

async function tryUpgrade(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  const { technologies, research_queue } = await new TechnologyListQuery().run({ player_id })

  for (const city of cities) {
    const [
      city_details,
      building_list
    ] = await Promise.all([
      new CityGetQuery().run({
        city_id: city.id,
        player_id
      }),
      new BuildingListQuery().run({
        city_id: city.id,
        player_id
      })
    ])

    const in_progress = building_list.buildings.some(building => 'upgrade_at' in building)
    const can_enqueue = in_progress && building_list.upgrade_queue.length < BUILDING_UPGRADE_QUEUE_LIMIT
    const can_start = !in_progress
      && city_details.building_levels_used < city_details.maximum_building_levels

    if (!can_start && !can_enqueue) {
      continue
    }

    const projected_buildings = projectBuildingLevelsForPolicy({
      buildings: building_list.buildings,
      upgrade_queue: building_list.upgrade_queue,
    })
    const projected_warehouses_capacity = projectWarehousesCapacity({
      buildings: building_list.buildings,
      upgrade_queue: building_list.upgrade_queue,
    })

    const use_projected_levels = !can_start && can_enqueue
    const levels = levelsForSystemRequirementGate({
      use_projected_levels,
      buildings: building_list.buildings,
      technologies,
      upgrade_queue: building_list.upgrade_queue,
      research_queue,
    })

    const buildings_to_try = sortBuildingsForSystemUpgrade({
      buildings: projected_buildings,
      resource_stock: city_details.resource_stock,
      warehouses_capacity: projected_warehouses_capacity,
      production_energy_ratio: city_details.production_energy_ratio,
      energy_supply: city_details.energy,
      energy_consumption: city_details.energy_consumption,
    })

    for (const projected_building of buildings_to_try) {
      const building = building_list.buildings.find(
        candidate => candidate.code === projected_building.code
      ) ?? projected_building

      if (hasPendingBuildingUpgrade({
        building_code: building.code,
        buildings: building_list.buildings,
        upgrade_queue: building_list.upgrade_queue,
      })) {
        continue
      }

      const details = await new BuildingGetQuery().run({
        city_id: city.id,
        player_id,
        building_code: building.code
      })

      if (!meetsBuildingUpgradeRequirement({
        building_code: building.code,
        levels,
      })) {
        continue
      }

      if (can_start && !canAfford(city_details.resource_stock, details.cost.resource)) {
        continue
      }

      if (building.code === BuildingCode.SOLAR_PANEL
        && !shouldSystemUpgradeSolarPanel({
          energy_supply: city_details.energy,
          energy_consumption: city_details.energy_consumption,
          production_energy_ratio: city_details.production_energy_ratio,
        })) {
        continue
      }

      if (!can_start && !can_enqueue) {
        continue
      }

      await upgradeBuilding({
        player_id,
        city_id: city.id,
        building_code: building.code
      })
      return {
        city_id: city.id,
        city_name: city.name,
        building_code: building.code,
        building_level: building.level + 1,
      }
    }
  }

  return null
}

async function tryResearch(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  const { technologies, research_queue } = await new TechnologyListQuery().run({ player_id })

  const in_progress = hasPendingTechnologyResearch(technologies)
  const can_enqueue = in_progress && research_queue.length < RESEARCH_QUEUE_LIMIT
  const can_start = !in_progress

  if (!can_start && !can_enqueue) {
    return null
  }

  const projected_technology_levels = projectTechnologyLevelsForPolicy({
    technologies,
    research_queue,
  })
  const research_order = sortTechnologiesForSystemResearch({
    technologies: projected_technology_levels,
    all_technologies: technologies,
    research_queue,
  })

  for (const city of cities) {
    const city_details = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })
    const building_list = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })
    const use_projected_levels = !can_start && can_enqueue
    const levels = levelsForSystemRequirementGate({
      use_projected_levels,
      buildings: building_list.buildings,
      technologies,
      upgrade_queue: building_list.upgrade_queue,
      research_queue,
    })

    for (const technology of research_order) {
      if (hasPendingTechnologyResearchByCode({
        technology_code: technology.code,
        technologies,
        research_queue,
      })) {
        continue
      }

      const details = await new TechnologyGetQuery().run({
        city_id: city.id,
        player_id,
        technology_code: technology.code
      })

      const technology_level = use_projected_levels
        ? technology.level
        : (technologies.find(entry => entry.code === technology.code)?.level ?? technology.level)

      if (!meetsTechnologyResearchRequirement({
        technology_code: technology.code,
        technology_level,
        levels,
      })) {
        continue
      }

      if (can_start && !canAfford(city_details.resource_stock, details.cost.resource)) {
        continue
      }

      if (!can_start && !can_enqueue) {
        continue
      }

      await researchTechnology({
        player_id,
        city_id: city.id,
        technology_code: technology.code
      })
      return {
        city_id: city.id,
        city_name: city.name,
        technology_code: technology.code,
      }
    }
  }

  return null
}

async function tryRecruit(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  const { technologies, research_queue } = await new TechnologyListQuery().run({ player_id })
  const [
    outpost_hints,
    army_counts,
  ] = await Promise.all([
    loadOutpostRecruitHints(player_id),
    loadEmpireCombatArmyCounts(player_id),
  ])
  const main_city = cities[0]
  const main_city_stock = main_city
    ? (await new CityGetQuery().run({
      city_id: main_city.id,
      player_id,
    })).resource_stock
    : {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
    }
  const combat_hints = combatRecruitHints({
    army_counts,
    has_city: cities.length > 0,
    main_city_stock,
  })
  const recruits: {
    city_id: string
    city_name: string
    troop_code: string
    count: number
  }[] = []

  for (const city of cities) {
    const [
      city_details,
      building_list,
      troop_list
    ] = await Promise.all([
      new CityGetQuery().run({
        city_id: city.id,
        player_id
      }),
      new BuildingListQuery().run({
        city_id: city.id,
        player_id
      }),
      new TroopListQuery().run({
        player_id,
        location: {
          type: 'city',
          city_id: city.id
        }
      })
    ])

    if (troop_list.pending_recruitment) {
      continue
    }

    const levels = levelsForSystemRequirementGate({
      use_projected_levels: false,
      buildings: building_list.buildings,
      technologies,
      upgrade_queue: building_list.upgrade_queue,
      research_queue,
    })

    const recruit_hints = recruitSortHintsForCity({
      city_troops: troop_list.troops,
      outpost_hints,
      combat: combat_hints,
    })
    const sorted_troops = sortTroopsForSystemRecruit({
      troops: troop_list.troops,
      hints: recruit_hints,
    })

    for (const troop of sorted_troops) {
      const cost = troop_list.costs[troop.code]
      if (!cost) {
        continue
      }

      if (!meetsTroopRecruitRequirement({
        troop_code: troop.code,
        levels,
      })) {
        continue
      }
      const count = systemRecruitBatchCount({
        troop_code: troop.code,
        stock: city_details.resource_stock,
        unit_cost: cost.resource,
        hints: recruit_hints,
      })
      if (count < 1) {
        continue
      }

      await recruitTroop({
        player_id,
        city_id: city.id,
        troop_code: troop.code,
        count,
      })
      recruits.push({
        city_id: city.id,
        city_name: city.name,
        troop_code: troop.code,
        count,
      })
      break
    }
  }

  if (recruits.length === 0) {
    return null
  }

  const total_count = recruits.reduce((sum, recruit) => sum + recruit.count, 0)
  const first = recruits[0]
  return {
    recruits,
    total_count,
    city_id: first.city_id,
    city_name: first.city_name,
    troop_code: first.troop_code,
    count: total_count,
  }
}

async function ownedLocationCells(player_id: string): Promise<{
  occupied_cell_ids: Set<string>
  origins: {
    coordinates: Coordinates
    location: { type: 'city', city_id: string } | { type: 'outpost', outpost_id: string }
  }[]
}> {
  const { cities } = await new CityListQuery().run({ player_id })
  const {
    outposts, cells 
  } = await new OutpostListQuery().run({ player_id })
  const occupied_cell_ids = new Set<string>()
  const origins: {
    coordinates: Coordinates
    location: { type: 'city', city_id: string } | { type: 'outpost', outpost_id: string }
  }[] = []

  for (const city of cities) {
    const details = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })
    occupied_cell_ids.add(details.cell.id)
    origins.push({
      coordinates: details.cell.coordinates,
      location: {
        type: 'city',
        city_id: city.id
      }
    })
  }

  outposts.forEach((outpost, index) => {
    const cell = cells[index]
    if (!cell) {
      return
    }
    occupied_cell_ids.add(cell.id)
    origins.push({
      coordinates: cell.coordinates,
      location: {
        type: 'outpost',
        outpost_id: outpost.id
      }
    })
  })

  return {
    occupied_cell_ids,
    origins
  }
}

async function tryExplore(player_id: string): Promise<Record<string, unknown> | null> {
  const [
    { origins, occupied_cell_ids },
    { cities, count_limit },
  ] = await Promise.all([
    ownedLocationCells(player_id),
    new CityListQuery().run({ player_id }),
  ])
  const can_found_city = cities.length < count_limit
  const base_cell_score = systemExpansionBaseCellScore({ can_found_city })

  if (await shouldSkipExploreForBasing({
    player_id,
    origins,
    occupied_cell_ids,
    can_found_city,
    base_cell_score,
  })) {
    return null
  }

  for (const origin of origins) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: origin.location
    })
    const scout = TroopService.findByRole({
      troops,
      role: TroopRole.SCOUT
    })
    if (!scout || scout.count < 1) {
      continue
    }

    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin.coordinates)
    })
    const explored = new Set(viewport.explored_cell_ids)
    const unexplored = viewport.cells.filter(cell => !explored.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin.coordinates))
    const destination = sortCellsByExpansionScore({
      cells: unexplored,
      score: systemExpansionScoutScore,
    })[0]
    if (!destination) {
      continue
    }

    await createTroopMovement({
      player_id,
      action: MovementAction.EXPLORE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops: [
        {
          code: scout.code,
          count: 1
        }
      ]
    })
    return {
      action: MovementAction.EXPLORE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops: [
        {
          code: scout.code,
          count: 1,
        },
      ],
    }
  }

  return null
}

async function shouldSkipExploreForBasing({
  player_id,
  origins,
  occupied_cell_ids,
  can_found_city,
  base_cell_score,
}: {
  player_id: string
  origins: Awaited<ReturnType<typeof ownedLocationCells>>['origins']
  occupied_cell_ids: Set<string>
  can_found_city: boolean
  base_cell_score: (cell: CellEntity) => number
}): Promise<boolean> {
  let best_base_score: number | null = null
  let best_unexplored_scout_score: number | null = null

  for (const origin of origins) {
    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin.coordinates),
    })
    const explored = new Set(viewport.explored_cell_ids)
    const base_candidates = viewport.cells.filter(cell => explored.has(cell.id)
      && !occupied_cell_ids.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin.coordinates))
    const best_base = sortCellsByExpansionScore({
      cells: base_candidates,
      score: base_cell_score,
    })[0]
    if (best_base) {
      const score = base_cell_score(best_base)
      best_base_score = best_base_score === null ? score : Math.max(best_base_score, score)
    }

    const unexplored = viewport.cells.filter(cell => !explored.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin.coordinates))
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

async function findBestBaseDestination({
  player_id,
  origins,
  occupied_cell_ids,
  base_cell_score,
}: {
  player_id: string
  origins: Awaited<ReturnType<typeof ownedLocationCells>>['origins']
  occupied_cell_ids: Set<string>
  base_cell_score: (cell: CellEntity) => number
}): Promise<CellEntity | null> {
  let best_destination: CellEntity | null = null
  let best_score = -Infinity

  for (const origin of origins) {
    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin.coordinates),
    })
    const explored = new Set(viewport.explored_cell_ids)
    const base_candidates = viewport.cells.filter(cell => explored.has(cell.id)
      && !occupied_cell_ids.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin.coordinates))
    const destination = sortCellsByExpansionScore({
      cells: base_candidates,
      score: base_cell_score,
    })[0]
    if (!destination) {
      continue
    }
    const score = base_cell_score(destination)
    if (score > best_score) {
      best_score = score
      best_destination = destination
    }
  }

  return best_destination
}

async function tryBase(player_id: string): Promise<Record<string, unknown> | null> {
  const {
    cities, count_limit 
  } = await new CityListQuery().run({ player_id })
  const can_found_city = cities.length < count_limit
  const base_cell_score = systemExpansionBaseCellScore({ can_found_city })

  const {
    origins, occupied_cell_ids 
  } = await ownedLocationCells(player_id)

  const destination = await findBestBaseDestination({
    player_id,
    origins,
    occupied_cell_ids,
    base_cell_score,
  })
  if (!destination) {
    return null
  }

  const player = await Factory.getRepository().player.get(player_id)

  for (const origin of origins) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: origin.location,
    })
    const move_troops = selectTroopsForSystemBase({
      troops,
      faction: player.faction_code,
    })
    if (!move_troops) {
      continue
    }

    await createTroopMovement({
      player_id,
      action: MovementAction.BASE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops,
    })
    return {
      action: MovementAction.BASE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops,
    }
  }

  return null
}

async function trySettle(player_id: string): Promise<Record<string, unknown> | null> {
  const {
    cities, count_limit 
  } = await new CityListQuery().run({ player_id })
  if (cities.length >= count_limit) {
    return null
  }

  const {
    outposts, cells 
  } = await new OutpostListQuery().run({ player_id })
  const settle_candidates = outposts
    .map((outpost, index) => ({
      outpost,
      cell: cells[index],
    }))
    .filter(({ outpost }) => outpost.type !== OutpostType.PERMANENT)
    .filter(({ cell }) => cell !== undefined)
    .sort((left, right) => {
      const score_delta = systemExpansionCitySiteScore(right.cell!) - systemExpansionCitySiteScore(left.cell!)
      if (score_delta !== 0) {
        return score_delta
      }
      if (left.cell!.coordinates.x !== right.cell!.coordinates.x) {
        return left.cell!.coordinates.x - right.cell!.coordinates.x
      }
      return left.cell!.coordinates.y - right.cell!.coordinates.y
    })

  for (const { outpost } of settle_candidates) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id
      }
    })
    const founder = TroopService.findByRole({
      troops,
      role: TroopRole.FOUNDER
    })
    if (!founder || founder.count < 1) {
      continue
    }

    const city_name = nextSystemCityName(cities.map(city => city.name))
    await citySettle({
      player_id,
      outpost_id: outpost.id,
      city_name,
    })
    return {
      outpost_id: outpost.id,
      city_name,
    }
  }

  return null
}

async function tryMakePermanent(player_id: string): Promise<Record<string, unknown> | null> {
  const {
    outposts, cells 
  } = await new OutpostListQuery().run({ player_id })
  const temporary_candidates = outposts
    .map((outpost, index) => ({
      outpost,
      cell: cells[index],
    }))
    .filter(({ outpost }) => outpost.type !== OutpostType.PERMANENT)
    .filter(({ cell }) => cell !== undefined)
    .sort((left, right) => {
      const score_delta = systemExpansionOutpostResourceScore(right.cell!) - systemExpansionOutpostResourceScore(left.cell!)
      if (score_delta !== 0) {
        return score_delta
      }
      if (left.cell!.coordinates.x !== right.cell!.coordinates.x) {
        return left.cell!.coordinates.x - right.cell!.coordinates.x
      }
      return left.cell!.coordinates.y - right.cell!.coordinates.y
    })

  const temporary = temporary_candidates[0]?.outpost
  if (!temporary) {
    return null
  }

  await outpostSetPermanent({
    player_id,
    outpost_id: temporary.id
  })
  return { outpost_id: temporary.id }
}

async function findCityTroopForRole({
  player_id,
  role,
}: {
  player_id: string
  role: SystemOutpostDeployRole
}): Promise<{
  city_id: string
  coordinates: Coordinates
  troop_code: TroopCode
} | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  for (const city of cities) {
    const city_details = await new CityGetQuery().run({
      city_id: city.id,
      player_id,
    })
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'city',
        city_id: city.id,
      },
    })
    const troop = TroopService.findByRole({
      troops,
      role,
    })
    if (!troop || troop.count < 1) {
      continue
    }
    return {
      city_id: city.id,
      coordinates: city_details.cell.coordinates,
      troop_code: troop.code,
    }
  }
  return null
}

async function tryDeployOutpostTroops(player_id: string): Promise<Record<string, unknown> | null> {
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

  const deploy_candidates = sortOutpostDeployCandidates(
    (
      await Promise.all(outposts.map(async (outpost, index) => {
        const cell = cells[index]
        const stock = resource_stocks[index]
        if (!cell || !stock || outpost.type !== OutpostType.PERMANENT) {
          return null
        }
        const { troops } = await new TroopListQuery().run({
          player_id,
          location: {
            type: 'outpost',
            outpost_id: outpost.id,
          },
        })
        return buildOutpostDeployCandidate({
          outpost,
          cell,
          stock,
          troops,
          warehouses_capacity: outpost_warehouses_capacity,
        })
      }))
    ).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null),
  )

  const role_priority: SystemOutpostDeployRole[] = [
    TroopRole.CULTIVATOR,
    TroopRole.SALVAGER,
    TroopRole.CARRIER,
  ]

  for (const candidate of deploy_candidates) {
    for (const role of role_priority) {
      if (!candidate.missing_roles.includes(role)) {
        continue
      }
      const source = await findCityTroopForRole({
        player_id,
        role,
      })
      if (!source) {
        continue
      }

      await createTroopMovement({
        player_id,
        action: MovementAction.BASE,
        origin: source.coordinates,
        destination: candidate.cell.coordinates,
        move_troops: [
          {
            code: source.troop_code,
            count: 1,
          },
        ],
      })
      return {
        action: MovementAction.BASE,
        role,
        origin: source.coordinates,
        destination: candidate.cell.coordinates,
        outpost_id: candidate.outpost.id,
        city_id: source.city_id,
        move_troops: [
          {
            code: source.troop_code,
            count: 1,
          },
        ],
      }
    }
  }

  return null
}

async function tryTransport(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  if (cities.length === 0) {
    return null
  }

  const city_details_list = await Promise.all(cities.map(city => new CityGetQuery().run({
    city_id: city.id,
    player_id,
  })))
  const city_candidates = city_details_list.map(details => ({
    city_id: details.city.id,
    city_name: details.city.name,
    coordinates: details.cell.coordinates,
    warehouse_space_remaining: details.warehouse_space_remaining,
  }))

  const [
    {
      outposts, cells, resource_stocks 
    },
    outpost_warehouses_capacity,
  ] = await Promise.all([
    new OutpostListQuery().run({ player_id }),
    AppService.getOutpostWarehousesCapacity({ player_id }),
  ])

  const outpost_candidates = sortOutpostsForSystemTransport(
    outposts
      .map((outpost, index) => ({
        outpost,
        cell: cells[index],
        stock: resource_stocks[index],
      }))
      .filter(({ outpost, cell, stock }) => {
        if (outpost.type !== OutpostType.PERMANENT || !cell || !stock) {
          return false
        }
        return isPermanentOutpostStockWorthTransport({
          stock,
          warehouses_capacity: outpost_warehouses_capacity,
          pressure_fill_ratio: SYSTEM_OUTPOST_TRANSPORT_PRESSURE_FILL_RATIO,
        })
      }),
  )

  for (const {
    outpost, cell, stock 
  } of outpost_candidates) {
    const destination = pickCityForSystemTransport({
      origin_stock: stock,
      cities: city_candidates,
    })
    if (!destination) {
      continue
    }

    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id
      }
    })
    const hauler = TroopService.findByRole({
      troops,
      role: TroopRole.CARRIER
    })
    if (!hauler || hauler.count < 1) {
      continue
    }

    const destination_capped = resourcesForTransportToDestination({
      origin_stock: stock,
      destination_space_remaining: destination.warehouse_space_remaining,
    })
    if (!hasTransportableStock(destination_capped)) {
      continue
    }

    const move_troops = carrierTroopsForTransportLoad({
      hauler,
      load: TroopService.getTransportLoad({ resources: destination_capped }),
    })
    if (move_troops.length === 0) {
      continue
    }

    const capacity = TroopService.getTotalTransportCapacity({ troops: move_troops })
    const resources = clampResourcesToTransportCapacity({
      resources: destination_capped,
      capacity,
    })
    if (!hasTransportableStock(resources)) {
      continue
    }

    await createTroopMovement({
      player_id,
      action: MovementAction.TRANSPORT,
      origin: cell.coordinates,
      destination: destination.coordinates,
      move_troops,
      resources
    })
    return {
      action: MovementAction.TRANSPORT,
      origin: cell.coordinates,
      destination: destination.coordinates,
      move_troops,
      resources,
      city_id: destination.city_id,
      city_name: destination.city_name,
      outpost_id: outpost.id,
    }
  }

  return null
}

async function tryAttack(player_id: string): Promise<Record<string, unknown> | null> {
  const army_counts = await loadEmpireCombatArmyCounts(player_id)
  if (!isSystemCombatArmyReady(army_counts)) {
    return null
  }
  const attacker = await Factory.getRepository().player.get(player_id)
  const attack = await pickSystemAttack({
    player_id,
    attacker_faction_code: attacker.faction_code,
    army_counts,
  })
  if (!attack) {
    return null
  }

  await createTroopMovement({
    player_id,
    action: MovementAction.ATTACK,
    origin: attack.origin,
    destination: attack.destination,
    move_troops: attack.move_troops,
    combat_strategy: SYSTEM_ATTACK_COMBAT_STRATEGY,
  })
  return {
    action: MovementAction.ATTACK,
    origin: attack.origin,
    destination: attack.destination,
    move_troops: attack.move_troops,
    combat_strategy: SYSTEM_ATTACK_COMBAT_STRATEGY,
  }
}

export const systemTickActions: Record<SystemTickCategory, SystemTickAction> = {
  upgrade: tryUpgrade,
  research: tryResearch,
  recruit: tryRecruit,
  'deploy-outpost': tryDeployOutpostTroops,
  explore: tryExplore,
  base: tryBase,
  settle: trySettle,
  'make-permanent': tryMakePermanent,
  transport: tryTransport,
  attack: tryAttack,
}
