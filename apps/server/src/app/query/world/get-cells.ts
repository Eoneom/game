import { CellEntity } from '#core/world/cell/entity'
import { CityInBounds } from '#app/port/repository/city'
import { OutpostInBounds } from '#app/port/repository/outpost'
import { GenericQuery } from '#query/generic'
import {
  MAX_VIEWPORT_SIDE,
  WORLD_SIZE
} from '#core/world/constant/size'
import { WorldError } from '#core/world/error'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { Coordinates } from '#core/world/value/coordinates'

interface WorldGetCellsQueryRequest {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
  player_id: string
}

export interface WorldMapCityMarker {
  id: string
  name: string
  player_id: string
  faction_code: FactionCode
  coordinates: Coordinates
}

export interface WorldMapOutpostMarker {
  id: string
  player_id: string
  faction_code: FactionCode
  type: OutpostType
  coordinates: Coordinates
}

export interface WorldGetCellsQueryResponse {
  cells: CellEntity[]
  explored_cell_ids: string[]
  viewer_faction_code: FactionCode
  settlements: {
    cities: WorldMapCityMarker[]
    outposts: WorldMapOutpostMarker[]
  }
}

export class WorldGetCellsQuery extends GenericQuery<WorldGetCellsQueryRequest, WorldGetCellsQueryResponse> {
  constructor() {
    super({ name: 'world:cells:get' })
  }

  protected async get({
    min_x,
    max_x,
    min_y,
    max_y,
    player_id
  }: WorldGetCellsQueryRequest): Promise<WorldGetCellsQueryResponse> {
    this.assertValidBounds({
      min_x,
      max_x,
      min_y,
      max_y
    })

    const bounds = {
      min_x,
      max_x,
      min_y,
      max_y
    }

    const [
      cells,
      exploration,
      viewer,
      cities_in_bounds,
      outposts_in_bounds
    ] = await Promise.all([
      this.repository.cell.getByBounds(bounds),
      this.repository.exploration.get({ player_id }),
      this.repository.player.get(player_id),
      this.repository.city.listInBounds(bounds),
      this.repository.outpost.listInBounds(bounds)
    ])

    const settlements = await this.mapSettlements({
      cities_in_bounds,
      outposts_in_bounds
    })

    return {
      cells,
      explored_cell_ids: exploration.cell_ids,
      viewer_faction_code: viewer.faction_code,
      settlements
    }
  }

  private async mapSettlements({
    cities_in_bounds,
    outposts_in_bounds
  }: {
    cities_in_bounds: CityInBounds[]
    outposts_in_bounds: OutpostInBounds[]
  }): Promise<WorldGetCellsQueryResponse['settlements']> {
    const player_ids = [
      ...new Set([
        ...cities_in_bounds.map(({ city }) => city.player_id),
        ...outposts_in_bounds.map(({ outpost }) => outpost.player_id)
      ])
    ]

    const faction_by_player_id = new Map<string, FactionCode>()
    await Promise.all(player_ids.map(async (owner_id) => {
      const player = await this.repository.player.get(owner_id)
      faction_by_player_id.set(owner_id, player.faction_code)
    }))

    const cities: WorldMapCityMarker[] = cities_in_bounds.map(({ city, coordinates }) => ({
      id: city.id,
      name: city.name,
      player_id: city.player_id,
      faction_code: faction_by_player_id.get(city.player_id) as FactionCode,
      coordinates
    }))

    const outposts: WorldMapOutpostMarker[] = outposts_in_bounds.map(({ outpost, coordinates }) => ({
      id: outpost.id,
      player_id: outpost.player_id,
      faction_code: faction_by_player_id.get(outpost.player_id) as FactionCode,
      type: outpost.type,
      coordinates
    }))

    return {
      cities,
      outposts
    }
  }

  private assertValidBounds({
    min_x,
    max_x,
    min_y,
    max_y
  }: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): void {
    const bounds = [
      min_x,
      max_x,
      min_y,
      max_y
    ]
    if (bounds.some(value => !Number.isInteger(value) || value < 1 || value > WORLD_SIZE)) {
      throw new Error(WorldError.INVALID_BOUNDS)
    }
    if (min_x > max_x || min_y > max_y) {
      throw new Error(WorldError.INVALID_BOUNDS)
    }
    if ((max_x - min_x + 1) > MAX_VIEWPORT_SIDE || (max_y - min_y + 1) > MAX_VIEWPORT_SIDE) {
      throw new Error(WorldError.INVALID_BOUNDS)
    }
  }
}
