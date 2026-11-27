import { GenericQuery } from '#query/generic'
import { WorldCellCache } from '#app/query/world/world-cells'
import { WORLD_SIZE } from '#core/world/constant/size'

interface WorldTerrainQueryResponse {
  size: number
  terrain: string
}

/** Static terrain of the whole world (slice 044), not secret: every viewport already exposed it (slice 005). */
export class WorldTerrainQuery extends GenericQuery<void, WorldTerrainQueryResponse> {
  constructor() {
    super({ name: 'world:terrain:get' })
  }

  protected async get(): Promise<WorldTerrainQueryResponse> {
    const { terrain } = await WorldCellCache.get(this.repository)
    return {
      size: WORLD_SIZE,
      terrain
    }
  }
}
