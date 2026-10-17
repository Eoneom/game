import { Factory } from '#adapter/factory'
import { BuildingService } from '#core/building/service'
import { TechnologyService } from '#core/technology/service'
import { now } from '#shared/time'
import type {
  AdminSystemPlayerStatsSnapshot,
} from '@eoneom/api-client/src/endpoints/admin/system-player-stats'
import { listSystemControlledPlayersForObservability } from '#app/query/admin/observability-access'

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
  const buildings_by_city = await Promise.all(cities.map(async city => {
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
  }))

  return {
    player_id,
    player_name,
    cities: cities.map(city => ({
      id: city.id,
      name: city.name,
      cell_id: city.cell_id,
    })),
    outposts: outposts.map(outpost => ({
      id: outpost.id,
      type: outpost.type,
      cell_id: outpost.cell_id,
    })),
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
