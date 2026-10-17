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
import { BuildingCode } from '#core/building/constant/code'
import { nextSystemCityName } from '#core/player/constant/system'
import { OutpostType } from '#core/outpost/constant/type'
import {
  Levels,
  RequirementService
} from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  WORLD_SIZE
} from '#core/world/constant/size'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource } from '#shared/resource'
import type { SystemTickAction } from '#command/player/system/policy'
import {
  hasPendingBuildingUpgrade,
  hasPendingTechnologyResearch,
  projectBuildingLevelsForPolicy,
  projectTechnologyLevelsForPolicy,
  projectWarehousesCapacity,
} from '#command/player/system/pending-upgrades'
import {
  resourcesForTransportToDestination,
  sortBuildingsForSystemUpgrade
} from '#command/player/system/storage'

function canAfford(stock: Resource, cost: Resource): boolean {
  return stock.plastic >= cost.plastic
    && stock.mushroom >= cost.mushroom
    && stock.plasma >= cost.plasma
}

function hasStock(stock: Resource): boolean {
  return stock.plastic + stock.mushroom + stock.plasma > 0
}

function isRequirementMet({ check }: {
  check: () => void
}): boolean {
  try {
    check()
    return true
  } catch {
    return false
  }
}

function levelsFrom({
  buildings,
  technologies
}: {
  buildings: { code: BuildingCode, level: number }[]
  technologies: { code: TechnologyCode, level: number }[]
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

function sortCells(cells: CellEntity[]): CellEntity[] {
  return [ ...cells ].sort((left, right) => {
    if (left.coordinates.x !== right.coordinates.x) {
      return left.coordinates.x - right.coordinates.x
    }
    return left.coordinates.y - right.coordinates.y
  })
}

async function tryUpgrade(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  const { technologies } = await new TechnologyListQuery().run({ player_id })

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

    const levels = levelsFrom({
      buildings: projected_buildings,
      technologies: projectTechnologyLevelsForPolicy(technologies),
    })

    const buildings_to_try = sortBuildingsForSystemUpgrade({
      buildings: projected_buildings,
      resource_stock: city_details.resource_stock,
      warehouses_capacity: projected_warehouses_capacity,
      production_energy_ratio: city_details.production_energy_ratio,
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

      const requirements_met = isRequirementMet({
        check: () => RequirementService.checkBuildingRequirement({
          building_code: building.code,
          levels
        })
      })
      if (!requirements_met) {
        continue
      }

      if (can_start && !canAfford(city_details.resource_stock, details.cost.resource)) {
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
  const { technologies } = await new TechnologyListQuery().run({ player_id })
  if (hasPendingTechnologyResearch(technologies)) {
    return null
  }

  for (const city of cities) {
    const city_details = await new CityGetQuery().run({
      city_id: city.id,
      player_id
    })
    const building_list = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })
    const projected_buildings = projectBuildingLevelsForPolicy({
      buildings: building_list.buildings,
      upgrade_queue: building_list.upgrade_queue,
    })
    const projected_technologies = projectTechnologyLevelsForPolicy(technologies)

    const levels = levelsFrom({
      buildings: projected_buildings,
      technologies: projected_technologies,
    })

    for (const technology of projected_technologies) {
      if ('research_at' in technology) {
        continue
      }

      const details = await new TechnologyGetQuery().run({
        city_id: city.id,
        player_id,
        technology_code: technology.code
      })

      const requirements_met = isRequirementMet({
        check: () => RequirementService.checkTechnologyRequirement({
          technology_code: technology.code,
          technology_level: technology.level,
          levels
        })
      })
      if (!requirements_met) {
        continue
      }
      if (!canAfford(city_details.resource_stock, details.cost.resource)) {
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
  const { technologies } = await new TechnologyListQuery().run({ player_id })

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

    const levels = levelsFrom({
      buildings: projectBuildingLevelsForPolicy({
        buildings: building_list.buildings,
        upgrade_queue: building_list.upgrade_queue,
      }),
      technologies: projectTechnologyLevelsForPolicy(technologies),
    })

    for (const troop of troop_list.troops) {
      const cost = troop_list.costs[troop.code]
      if (!cost) {
        continue
      }

      const requirements_met = isRequirementMet({
        check: () => RequirementService.checkTroopRequirement({
          troop_code: troop.code,
          levels
        })
      })
      if (!requirements_met) {
        continue
      }
      if (!canAfford(city_details.resource_stock, cost.resource)) {
        continue
      }

      await recruitTroop({
        player_id,
        city_id: city.id,
        troop_code: troop.code,
        count: 1
      })
      return {
        city_id: city.id,
        city_name: city.name,
        troop_code: troop.code,
        count: 1,
      }
    }
  }

  return null
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
  const { origins } = await ownedLocationCells(player_id)

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
    const destination = sortCells(viewport.cells).find(cell => !explored.has(cell.id) && !sameCoordinates(cell.coordinates, origin.coordinates))
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

async function tryBase(player_id: string): Promise<Record<string, unknown> | null> {
  const {
    origins, occupied_cell_ids 
  } = await ownedLocationCells(player_id)

  for (const origin of origins) {
    const { troops } = await new TroopListQuery().run({
      player_id,
      location: origin.location
    })
    const founder = TroopService.findByRole({
      troops,
      role: TroopRole.FOUNDER
    })
    if (!founder || founder.count < 1) {
      continue
    }

    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...viewportAround(origin.coordinates)
    })
    const explored = new Set(viewport.explored_cell_ids)
    const destination = sortCells(viewport.cells).find(cell => explored.has(cell.id)
      && !occupied_cell_ids.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin.coordinates))
    if (!destination) {
      continue
    }

    await createTroopMovement({
      player_id,
      action: MovementAction.BASE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops: [
        {
          code: founder.code,
          count: 1
        }
      ]
    })
    return {
      action: MovementAction.BASE,
      origin: origin.coordinates,
      destination: destination.coordinates,
      move_troops: [
        {
          code: founder.code,
          count: 1,
        },
      ],
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

  const { outposts } = await new OutpostListQuery().run({ player_id })
  for (const outpost of outposts) {
    if (outpost.type === OutpostType.PERMANENT) {
      continue
    }

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
  const { outposts } = await new OutpostListQuery().run({ player_id })
  const temporary = outposts.find(outpost => outpost.type !== OutpostType.PERMANENT)
  if (!temporary) {
    return null
  }

  await outpostSetPermanent({
    player_id,
    outpost_id: temporary.id
  })
  return { outpost_id: temporary.id }
}

async function tryTransport(player_id: string): Promise<Record<string, unknown> | null> {
  const { cities } = await new CityListQuery().run({ player_id })
  const city = cities[0]
  if (!city) {
    return null
  }

  const city_details = await new CityGetQuery().run({
    city_id: city.id,
    player_id
  })
  const {
    outposts, cells, resource_stocks 
  } = await new OutpostListQuery().run({ player_id })

  for (const [
    index,
    outpost 
  ] of outposts.entries()) {
    if (outpost.type !== OutpostType.PERMANENT) {
      continue
    }

    const cell = cells[index]
    const stock = resource_stocks[index]
    if (!cell || !stock || !hasStock(stock)) {
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

    const resources = resourcesForTransportToDestination({
      origin_stock: stock,
      destination_space_remaining: city_details.warehouse_space_remaining,
    })
    if (!hasStock(resources)) {
      continue
    }
    const move_troops = [
      {
        code: hauler.code,
        count: hauler.count
      }
    ]
    const load = TroopService.getTransportLoad({ resources })
    const capacity = TroopService.getTotalTransportCapacity({ troops: move_troops })
    if (load > capacity) {
      continue
    }

    await createTroopMovement({
      player_id,
      action: MovementAction.TRANSPORT,
      origin: cell.coordinates,
      destination: city_details.cell.coordinates,
      move_troops,
      resources
    })
    return {
      action: MovementAction.TRANSPORT,
      origin: cell.coordinates,
      destination: city_details.cell.coordinates,
      move_troops,
      resources,
      city_id: city.id,
      city_name: city.name,
      outpost_id: outpost.id,
    }
  }

  return null
}

export const systemTickActions: Record<SystemTickCategory, SystemTickAction> = {
  upgrade: tryUpgrade,
  research: tryResearch,
  recruit: tryRecruit,
  explore: tryExplore,
  base: tryBase,
  settle: trySettle,
  'make-permanent': tryMakePermanent,
  transport: tryTransport,
}
