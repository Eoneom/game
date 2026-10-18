import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { AppService } from '#app/service'
import { BuildingService } from '#core/building/service'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { TechnologyService } from '#core/technology/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { BuildingCode } from '#core/building/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'
import type { Resource, WarehouseCapacity } from '#shared/resource'
import type {
  AdminSystemPlayerOngoingMovement,
  AdminSystemPlayerStatsSnapshot,
} from '@eoneom/api-client/src/endpoints/admin/system-player-stats'
import { listSystemControlledPlayersForObservability } from '#app/query/admin/observability-access'

function resourceFromStock(stock: ResourceStockEntity): Resource {
  return {
    plastic: stock.plastic,
    mushroom: stock.mushroom,
    plasma: stock.plasma,
  }
}

async function troopsInCell({
  cell_id,
  player_id,
}: {
  cell_id: string
  player_id: string
}): Promise<{ code: TroopCode, count: number }[]> {
  const repository = Factory.getRepository()
  const troops = await repository.troop.listInCell({
    cell_id,
    player_id,
  })
  return TroopService.sortTroops({ troops }).map(troop => ({
    code: troop.code,
    count: troop.count,
  }))
}

async function pendingRecruitmentForCity({
  city_id,
  player_id,
  cell_id,
}: {
  city_id: string
  player_id: string
  cell_id: string
}): Promise<{
  troop_code: TroopCode
  finish_at: number
  remaining_count: number
} | null> {
  const pending = await Factory.getJobQueue().getPendingTroopRecruitProgress({ city_id })
  if (!pending) {
    return null
  }
  const repository = Factory.getRepository()
  const troops = await repository.troop.listInCell({
    cell_id,
    player_id,
  })
  const recruiting = troops.find(troop => troop.id === pending.troop_id)
  if (!recruiting) {
    return null
  }
  return {
    troop_code: recruiting.code,
    finish_at: pending.finish_at,
    remaining_count: pending.remaining_count,
  }
}

async function citySummary({
  city,
  player_id,
}: {
  city: CityEntity
  player_id: string
}): Promise<AdminSystemPlayerStatsSnapshot['cities'][number]> {
  const repository = Factory.getRepository()
  const [
    cell,
    production,
    warehouses_capacity,
    solar_panel_level,
    energy_consumption_breakdown,
    troops,
    pending_recruitment,
  ] = await Promise.all([
    repository.cell.getById(city.cell_id),
    AppService.getCityProductionBreakdown({
      city_id: city.id,
      player_id,
    }),
    AppService.getCityWarehousesCapacity({ city_id: city.id }),
    repository.building.getLevel({
      city_id: city.id,
      code: BuildingCode.SOLAR_PANEL,
    }),
    AppService.getCityEnergyConsumptionBreakdown({
      city_id: city.id,
      player_id,
    }),
    troopsInCell({
      cell_id: city.cell_id,
      player_id,
    }),
    pendingRecruitmentForCity({
      city_id: city.id,
      player_id,
      cell_id: city.cell_id,
    }),
  ])

  const energy_breakdown = await AppService.getCityEnergyBreakdown({
    city_id: city.id,
    player_id,
    solar_panel_level,
  })

  const stock_row = await repository.resource_stock.getByCellId({ cell_id: cell.id })
  AppService.assertResourceStockMatchesCityCell({
    city,
    city_cell: cell,
    stock: stock_row,
  })

  const { stock } = stock_row.gather({
    gather_at_time: now(),
    earnings_per_second: production.earnings_per_second,
    warehouses_capacity,
  })

  const stock_resources = resourceFromStock(stock)
  const warehouse_space_remaining: WarehouseCapacity = {
    plastic: Math.max(0, warehouses_capacity.plastic - stock_resources.plastic),
    mushroom: Math.max(0, warehouses_capacity.mushroom - stock_resources.mushroom),
  }

  return {
    id: city.id,
    name: city.name,
    coordinates: {
      x: cell.coordinates.x,
      y: cell.coordinates.y,
    },
    resources: stock_resources,
    earnings_per_second: production.earnings_per_second,
    energy: energy_breakdown.energy,
    energy_consumption: energy_consumption_breakdown.energy_consumption,
    production_energy_ratio: energy_consumption_breakdown.production_energy_ratio,
    warehouses_capacity,
    warehouse_space_remaining,
    troops,
    pending_recruitment,
  }
}

export async function listOngoingMovementsForPlayer({
  player_id,
}: {
  player_id: string
}): Promise<AdminSystemPlayerOngoingMovement[]> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const movements = await repository.movement.list({ player_id })

  const entries = await Promise.all(movements.map(async (movement) => {
    const arrive_at = await resolveMovementArriveAt({
      movement_id: movement.id,
      job_queue,
      battle_repository: repository.battle,
    })
    if (arrive_at === null) {
      return null
    }

    const troops = await repository.troop.listByMovement({ movement_id: movement.id })

    return {
      id: movement.id,
      action: movement.action,
      origin: {
        x: movement.origin.x,
        y: movement.origin.y,
      },
      destination: {
        x: movement.destination.x,
        y: movement.destination.y,
      },
      arrive_at,
      resources: {
        plastic: movement.resources.plastic,
        mushroom: movement.resources.mushroom,
        plasma: movement.resources.plasma,
      },
      troops: TroopService.sortTroops({ troops }).map(troop => ({
        code: troop.code,
        count: troop.count,
      })),
    }
  }))

  return entries.filter((entry): entry is AdminSystemPlayerOngoingMovement => entry !== null)
}

async function outpostSummary({
  outpost,
  player_id,
}: {
  outpost: OutpostEntity
  player_id: string
}): Promise<AdminSystemPlayerStatsSnapshot['outposts'][number]> {
  const repository = Factory.getRepository()
  const [
    cell,
    troops,
  ] = await Promise.all([
    repository.cell.getById(outpost.cell_id),
    troopsInCell({
      cell_id: outpost.cell_id,
      player_id,
    }),
  ])
  const stock_row = await repository.resource_stock.getByCellId({ cell_id: outpost.cell_id })

  let stock = stock_row
  let earnings_per_second: Resource = {
    plastic: 0,
    mushroom: 0,
    plasma: 0,
  }
  let warehouses_capacity: WarehouseCapacity = {
    plastic: 0,
    mushroom: 0,
  }
  let warehouse_space_remaining: WarehouseCapacity = {
    plastic: 0,
    mushroom: 0,
  }
  if (outpost.type === OutpostType.PERMANENT) {
    const [
      production,
      outpost_warehouses_capacity,
    ] = await Promise.all([
      AppService.getOutpostProductionBreakdown({ outpost_id: outpost.id }),
      AppService.getOutpostWarehousesCapacity({ player_id }),
    ])
    warehouses_capacity = outpost_warehouses_capacity
    earnings_per_second = production.earnings_per_second
    stock = stock_row.gather({
      gather_at_time: now(),
      earnings_per_second: production.earnings_per_second,
      warehouses_capacity: outpost_warehouses_capacity,
    }).stock
  }

  const stock_resources = resourceFromStock(stock)
  if (outpost.type === OutpostType.PERMANENT) {
    warehouse_space_remaining = {
      plastic: Math.max(0, warehouses_capacity.plastic - stock_resources.plastic),
      mushroom: Math.max(0, warehouses_capacity.mushroom - stock_resources.mushroom),
    }
  }

  return {
    id: outpost.id,
    type: outpost.type,
    coordinates: cell.coordinates,
    resources: stock_resources,
    earnings_per_second,
    warehouses_capacity,
    warehouse_space_remaining,
    troops,
  }
}

export async function collectSystemPlayerStatsSnapshot({
  player_id,
  player_name,
}: {
  player_id: string
  player_name: string
}): Promise<AdminSystemPlayerStatsSnapshot> {
  const repository = Factory.getRepository()
  const [
    cities,
    outposts,
    technologies,
  ] = await Promise.all([
    repository.city.list({ player_id }),
    repository.outpost.list({ player_id }),
    repository.technology.list({ player_id }),
  ])

  const sorted_technologies = TechnologyService.sortTechnologies({ technologies })
  const [
    city_summaries,
    outpost_summaries,
    ongoing_movements,
    buildings_by_city,
  ] = await Promise.all([
    Promise.all(cities.map(city => citySummary({ city, player_id }))),
    Promise.all(outposts.map(outpost => outpostSummary({ outpost, player_id }))),
    listOngoingMovementsForPlayer({ player_id }),
    Promise.all(cities.map(async city => {
      const buildings = await repository.building.list({ city_id: city.id })
      const sorted = BuildingService.sortBuildings({ buildings })
      return {
        city_id: city.id,
        city_name: city.name,
        buildings: sorted.map(building => ({
          code: building.code,
          level: building.level,
        })),
      }
    })),
  ])

  const outposts_sorted_by_coordinates = [ ...outpost_summaries ].sort((left, right) => {
    if (left.coordinates.x !== right.coordinates.x) {
      return left.coordinates.x - right.coordinates.x
    }
    return left.coordinates.y - right.coordinates.y
  })

  return {
    player_id,
    player_name,
    cities: city_summaries,
    outposts: outposts_sorted_by_coordinates,
    technologies: sorted_technologies.map(technology => ({
      code: technology.code,
      level: technology.level,
    })),
    ongoing_movements,
    buildings_by_city,
    updated_at: now(),
  }
}

export async function listSystemPlayerStatsSnapshots(): Promise<AdminSystemPlayerStatsSnapshot[]> {
  const players = await listSystemControlledPlayersForObservability()
  return Promise.all(players.map(player => collectSystemPlayerStatsSnapshot({
    player_id: player.id,
    player_name: player.name,
  })))
}
