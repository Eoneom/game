import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { BuildingService } from '#core/building/service'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { TechnologyService } from '#core/technology/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { now } from '#shared/time'
import type { Resource } from '#shared/resource'
import type {
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
  ] = await Promise.all([
    repository.cell.getById(city.cell_id),
    AppService.getCityProductionBreakdown({
      city_id: city.id,
      player_id,
    }),
    AppService.getCityWarehousesCapacity({ city_id: city.id }),
  ])

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

  return {
    id: city.id,
    name: city.name,
    coordinates: {
      x: cell.coordinates.x,
      y: cell.coordinates.y,
    },
    resources: resourceFromStock(stock),
  }
}

async function outpostSummary({
  outpost,
  player_id,
}: {
  outpost: OutpostEntity
  player_id: string
}): Promise<AdminSystemPlayerStatsSnapshot['outposts'][number]> {
  const repository = Factory.getRepository()
  const cell = await repository.cell.getById(outpost.cell_id)
  const stock_row = await repository.resource_stock.getByCellId({ cell_id: outpost.cell_id })

  let stock = stock_row
  if (outpost.type === OutpostType.PERMANENT) {
    const [
      production,
      warehouses_capacity,
    ] = await Promise.all([
      AppService.getOutpostProductionBreakdown({ outpost_id: outpost.id }),
      AppService.getOutpostWarehousesCapacity({ player_id }),
    ])
    stock = stock_row.gather({
      gather_at_time: now(),
      earnings_per_second: production.earnings_per_second,
      warehouses_capacity,
    }).stock
  }

  return {
    id: outpost.id,
    type: outpost.type,
    coordinates: cell.coordinates,
    resources: resourceFromStock(stock),
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
    buildings_by_city,
  ] = await Promise.all([
    Promise.all(cities.map(city => citySummary({ city, player_id }))),
    Promise.all(outposts.map(outpost => outpostSummary({ outpost, player_id }))),
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

  return {
    player_id,
    player_name,
    cities: city_summaries,
    outposts: outpost_summaries,
    technologies: sorted_technologies.map(technology => ({
      code: technology.code,
      level: technology.level,
    })),
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
