import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import { Coordinates } from '#core/world/value/coordinates'
import {
  INITIAL_VIEWPORT_HALF_EXTENT,
  WORLD_SIZE,
} from '#core/world/constant/size'
import {
  WorldGetCellsQuery,
  type WorldGetCellsQueryResponse,
} from '#query/world/get-cells'

export type WorldViewportBounds = {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

/** Stable cache key for an 11×11 system-AI viewport (`INITIAL_VIEWPORT_HALF_EXTENT`). */
export function viewportCacheKey(bounds: WorldViewportBounds): string {
  return `${bounds.min_x},${bounds.min_y},${bounds.max_x},${bounds.max_y}`
}

export function viewportAround(coordinates: Coordinates): WorldViewportBounds {
  return {
    min_x: Math.max(1, coordinates.x - INITIAL_VIEWPORT_HALF_EXTENT),
    max_x: Math.min(WORLD_SIZE, coordinates.x + INITIAL_VIEWPORT_HALF_EXTENT),
    min_y: Math.max(1, coordinates.y - INITIAL_VIEWPORT_HALF_EXTENT),
    max_y: Math.min(WORLD_SIZE, coordinates.y + INITIAL_VIEWPORT_HALF_EXTENT),
  }
}

/**
 * Per replan-iteration cache for `WorldGetCellsQuery`.
 *
 * Query budget: at most one `world:cells:get` per distinct owned origin viewport
 * (typically ≤ city + outpost count) while this context is reused. Snapshot
 * collection, frontier queue, intel, defer-explore, and tick actions share it.
 */
export class SystemTickContext {
  readonly player_id: string
  private readonly viewport_cache = new Map<string, WorldGetCellsQueryResponse>()
  private world_get_cells_query_count = 0
  /** Latest empire snapshot for this replan iteration (set by tick / policy). */
  snapshot?: SystemEmpireSnapshot

  constructor(player_id: string) {
    this.player_id = player_id
  }

  getWorldGetCellsQueryCount(): number {
    return this.world_get_cells_query_count
  }

  async getViewportForOrigin(
    origin: Coordinates,
    player_id = this.player_id,
  ): Promise<WorldGetCellsQueryResponse> {
    const bounds = viewportAround(origin)
    const key = viewportCacheKey(bounds)
    const cached = this.viewport_cache.get(key)
    if (cached) {
      return cached
    }
    const viewport = await new WorldGetCellsQuery().run({
      player_id,
      ...bounds,
    })
    this.viewport_cache.set(key, viewport)
    this.world_get_cells_query_count += 1
    return viewport
  }
}

export function createSystemTickContext(player_id: string): SystemTickContext {
  return new SystemTickContext(player_id)
}

/** Uncached fallback when no tick context is provided (unit tests, ad-hoc calls). */
export async function getWorldViewportForOrigin({
  player_id,
  origin,
  context,
}: {
  player_id: string
  origin: Coordinates
  context?: SystemTickContext
}): Promise<WorldGetCellsQueryResponse> {
  if (context) {
    return context.getViewportForOrigin(origin, player_id)
  }
  const bounds = viewportAround(origin)
  return new WorldGetCellsQuery().run({
    player_id,
    ...bounds,
  })
}
