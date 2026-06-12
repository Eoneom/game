import { CellEntity } from '#core/world/cell/entity'
import { GenericQuery } from '#query/generic'
import {
  MAX_VIEWPORT_SIDE,
  WORLD_SIZE
} from '#core/world/constant/size'
import { WorldError } from '#core/world/error'

interface WorldGetCellsQueryRequest {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
  player_id: string
}

export interface WorldGetCellsQueryResponse {
  cells: CellEntity[]
  explored_cell_ids: string[]
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

    const cells = await this.repository.cell.getByBounds({
      min_x,
      max_x,
      min_y,
      max_y
    })
    const exploration = await this.repository.exploration.get({ player_id })

    return {
      cells,
      explored_cell_ids: exploration.cell_ids
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
