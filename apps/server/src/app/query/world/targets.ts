import { GenericQuery } from '#query/generic'
import { WorldCellCache } from '#app/query/world/world-cells'
import {
  CityMarker,
  describeSettlements,
  OutpostMarker
} from '#app/query/world/settlements'
import {
  TargetIntel,
  toTargetIntel
} from '#app/query/world/target-intel'
import {
  TARGET_SCAN_LIMIT,
  TARGET_SCAN_RADIUS
} from '#core/intel/constant/targets'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { WORLD_SIZE } from '#core/world/constant/size'
import { CitySize } from '#core/world/marker'
import { Coordinates } from '#core/world/value/coordinates'

interface WorldTargetsQueryRequest {
  player_id: string
}

type LocationKind = 'city' | 'outpost'

interface OwnLocation {
  kind: LocationKind
  id: string
  coordinates: Coordinates
}

interface WorldTarget {
  kind: LocationKind
  id: string
  category: 'target' | 'threat'
  relation: 'system' | 'enemy'
  name: string | null
  outpost_type: OutpostType | null
  owner_name: string
  alliance_tag: string | null
  faction_code: FactionCode
  size: CitySize | null
  coordinates: Coordinates
  nearest: OwnLocation & { distance: number }
  intel: TargetIntel | null
}

interface WorldTargetsQueryResponse {
  radius: number
  targets: WorldTarget[]
}

const manhattan = (a: Coordinates, b: Coordinates): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

const coordinatesKey = ({
  x, y
}: Coordinates): string => `${x}:${y}`

const clampCoordinate = (value: number): number => Math.max(1, Math.min(WORLD_SIZE, value))

/**
 * « Cibles et menaces » (slice 044): system cities and outposts and enemy-faction outposts are targets, enemy-faction
 * human cities are threats, within `TARGET_SCAN_RADIUS` cells of the nearest own city or outpost. Each carries the
 * viewer's latest successful spy report on its cell, if any.
 */
export class WorldTargetsQuery extends GenericQuery<WorldTargetsQueryRequest, WorldTargetsQueryResponse> {
  constructor() {
    super({ name: 'world:targets:get' })
  }

  protected async get({ player_id }: WorldTargetsQueryRequest): Promise<WorldTargetsQueryResponse> {
    const own = await this.listOwnLocations(player_id)
    if (own.length === 0) {
      return {
        radius: TARGET_SCAN_RADIUS,
        targets: []
      }
    }

    const bounds = {
      min_x: clampCoordinate(Math.min(...own.map(location => location.coordinates.x)) - TARGET_SCAN_RADIUS),
      max_x: clampCoordinate(Math.max(...own.map(location => location.coordinates.x)) + TARGET_SCAN_RADIUS),
      min_y: clampCoordinate(Math.min(...own.map(location => location.coordinates.y)) - TARGET_SCAN_RADIUS),
      max_y: clampCoordinate(Math.max(...own.map(location => location.coordinates.y)) + TARGET_SCAN_RADIUS)
    }
    const [
      cities_in_bounds,
      outposts_in_bounds
    ] = await Promise.all([
      this.repository.city.listInBounds(bounds),
      this.repository.outpost.listInBounds(bounds)
    ])

    const nearestOf = (coordinates: Coordinates): OwnLocation & { distance: number } => own
      .map(location => ({
        ...location,
        distance: manhattan(location.coordinates, coordinates)
      }))
      .reduce((best, candidate) => (candidate.distance < best.distance ? candidate : best))

    const in_radius = <T extends { coordinates: Coordinates }>(entries: T[]): T[] => entries
      .filter(entry => nearestOf(entry.coordinates).distance <= TARGET_SCAN_RADIUS)

    const settlements = await describeSettlements({
      repository: this.repository,
      viewer_id: player_id,
      cities: in_radius(cities_in_bounds),
      outposts: in_radius(outposts_in_bounds)
    })

    const candidates = [
      ...settlements.cities.map(city => this.fromCity(city, nearestOf(city.coordinates))),
      ...settlements.outposts.map(outpost => this.fromOutpost(outpost, nearestOf(outpost.coordinates)))
    ]
      .filter((target): target is WorldTarget => target !== null)
      .sort((left, right) => left.nearest.distance - right.nearest.distance
        || left.coordinates.y - right.coordinates.y
        || left.coordinates.x - right.coordinates.x
        || left.kind.localeCompare(right.kind))
      .slice(0, TARGET_SCAN_LIMIT)

    const intel = await this.repository.report.listLatestSpyIntel({
      player_id,
      coordinates: [
        ...new Map(candidates.map(target => [
          coordinatesKey(target.coordinates),
          target.coordinates
        ])).values()
      ]
    })
    const intel_by_cell = new Map(intel.map(entry => [
      coordinatesKey(entry.coordinates),
      toTargetIntel(entry)
    ]))

    return {
      radius: TARGET_SCAN_RADIUS,
      targets: candidates.map(target => ({
        ...target,
        intel: intel_by_cell.get(coordinatesKey(target.coordinates)) ?? null
      }))
    }
  }

  private async listOwnLocations(player_id: string): Promise<OwnLocation[]> {
    const [
      world,
      cities,
      outposts
    ] = await Promise.all([
      WorldCellCache.get(this.repository),
      this.repository.city.list({ player_id }),
      this.repository.outpost.list({ player_id })
    ])

    const locate = (kind: LocationKind, id: string, cell_id: string): OwnLocation[] => {
      const cell = world.by_id.get(cell_id)
      return cell
        ? [
          {
            kind,
            id,
            coordinates: cell.coordinates
          }
        ]
        : []
    }

    return [
      ...cities.flatMap(city => locate('city', city.id, city.cell_id)),
      ...outposts.flatMap(outpost => locate('outpost', outpost.id, outpost.cell_id))
    ]
  }

  private fromCity(city: CityMarker, nearest: WorldTarget['nearest']): WorldTarget | null {
    if (city.relation !== 'system' && city.relation !== 'enemy') {
      return null
    }
    return {
      kind: 'city',
      id: city.id,
      category: city.relation === 'system' ? 'target' : 'threat',
      relation: city.relation,
      name: city.name,
      outpost_type: null,
      owner_name: city.owner_name,
      alliance_tag: city.alliance_tag,
      faction_code: city.faction_code,
      size: city.size,
      coordinates: city.coordinates,
      nearest,
      intel: null
    }
  }

  private fromOutpost(outpost: OutpostMarker, nearest: WorldTarget['nearest']): WorldTarget | null {
    if (outpost.relation !== 'system' && outpost.relation !== 'enemy') {
      return null
    }
    return {
      kind: 'outpost',
      id: outpost.id,
      category: 'target',
      relation: outpost.relation,
      name: null,
      outpost_type: outpost.type,
      owner_name: outpost.owner_name,
      alliance_tag: outpost.alliance_tag,
      faction_code: outpost.faction_code,
      size: null,
      coordinates: outpost.coordinates,
      nearest,
      intel: null
    }
  }
}
