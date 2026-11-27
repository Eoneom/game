import { GenericQuery } from '#query/generic'
import { WorldCellCache } from '#app/query/world/world-cells'

interface WorldExplorationQueryRequest {
  player_id: string
}

/** `[x, y, plastic, mushroom, solar]`, coefficients rounded to 2 decimals. */
type ExploredCell = [number, number, number, number, number]

interface WorldExplorationQueryResponse {
  cells: ExploredCell[]
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/** The viewer's explored cells with their coefficients (slice 044); coefficients stay hidden elsewhere (slice 005). */
export class WorldExplorationQuery extends GenericQuery<WorldExplorationQueryRequest, WorldExplorationQueryResponse> {
  constructor() {
    super({ name: 'world:exploration:get' })
  }

  protected async get({ player_id }: WorldExplorationQueryRequest): Promise<WorldExplorationQueryResponse> {
    const [
      world,
      exploration
    ] = await Promise.all([
      WorldCellCache.get(this.repository),
      this.repository.exploration.get({ player_id })
    ])
    const explored = new Set(exploration.cell_ids)

    return {
      cells: world.cells
        .filter(cell => explored.has(cell.id))
        .map(cell => [
          cell.coordinates.x,
          cell.coordinates.y,
          round2(cell.resource_coefficient.plastic),
          round2(cell.resource_coefficient.mushroom),
          round2(cell.solar_coefficient),
        ])
    }
  }
}
