import { CityInBounds } from '#app/port/repository/city'
import { Repository } from '#app/port/repository/generic'
import { OutpostInBounds } from '#app/port/repository/outpost'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import {
  CitySize,
  MarkerRelation,
  WorldMarkerService
} from '#core/world/marker'
import { Coordinates } from '#core/world/value/coordinates'

export interface MarkerViewer {
  player_id: string
  faction_code: FactionCode
  alliance_id: string | null
}

interface SettlementOwner {
  player_id: string
  owner_name: string
  faction_code: FactionCode
  alliance_tag: string | null
  relation: MarkerRelation
  coordinates: Coordinates
}

export type CityMarker = SettlementOwner & {
  id: string
  name: string
  size: CitySize
}

export type OutpostMarker = SettlementOwner & {
  id: string
  type: OutpostType
}

export interface DescribedSettlements {
  viewer: MarkerViewer
  cities: CityMarker[]
  outposts: OutpostMarker[]
}

/**
 * Owner, alliance tag, relation and size of settlements (slice 044) in grouped reads: players, alliance tags (with
 * the viewer's own alliance) and building level totals. No per-settlement query.
 */
export const describeSettlements = async ({
  repository,
  viewer_id,
  cities,
  outposts,
}: {
  repository: Repository
  viewer_id: string
  cities: CityInBounds[]
  outposts: OutpostInBounds[]
}): Promise<DescribedSettlements> => {
  const player_ids = [
    ...new Set([
      viewer_id,
      ...cities.map(({ city }) => city.player_id),
      ...outposts.map(({ outpost }) => outpost.player_id)
    ])
  ]

  const [
    players,
    tags,
    levels
  ] = await Promise.all([
    repository.player.listByIds(player_ids),
    repository.alliance.listTagsByPlayerIds(player_ids),
    repository.building.sumLevelsByCityIds(cities.map(({ city }) => city.id))
  ])

  const player_by_id = new Map(players.map(player => [
    player.id,
    player
  ]))
  const tag_by_player_id = new Map(tags.map(entry => [
    entry.player_id,
    entry
  ]))
  const total_by_city_id = new Map(levels.map(entry => [
    entry.city_id,
    entry.total
  ]))

  const viewer_player = player_by_id.get(viewer_id) ?? await repository.player.get(viewer_id)
  const viewer: MarkerViewer = {
    player_id: viewer_id,
    faction_code: viewer_player.faction_code,
    alliance_id: tag_by_player_id.get(viewer_id)?.alliance_id ?? null
  }

  const describeOwner = (player_id: string, coordinates: Coordinates): SettlementOwner | null => {
    const owner = player_by_id.get(player_id)
    if (!owner) {
      return null
    }
    const tag = tag_by_player_id.get(player_id) ?? null
    return {
      player_id,
      owner_name: owner.name,
      faction_code: owner.faction_code,
      alliance_tag: tag?.tag ?? null,
      relation: WorldMarkerService.getRelation({
        viewer,
        owner: {
          player_id,
          faction_code: owner.faction_code,
          alliance_id: tag?.alliance_id ?? null,
          system_controlled: owner.system_controlled
        }
      }),
      coordinates
    }
  }

  const city_markers: CityMarker[] = []
  for (const {
    city, coordinates
  } of cities) {
    const owner = describeOwner(city.player_id, coordinates)
    if (owner) {
      city_markers.push({
        ...owner,
        id: city.id,
        name: city.name,
        size: WorldMarkerService.getCitySize(total_by_city_id.get(city.id) ?? 0)
      })
    }
  }

  const outpost_markers: OutpostMarker[] = []
  for (const {
    outpost, coordinates
  } of outposts) {
    const owner = describeOwner(outpost.player_id, coordinates)
    if (owner) {
      outpost_markers.push({
        ...owner,
        id: outpost.id,
        type: outpost.type
      })
    }
  }

  return {
    viewer,
    cities: city_markers,
    outposts: outpost_markers
  }
}
