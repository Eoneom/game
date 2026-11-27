import { Repository } from '#app/port/repository/generic'
import { WORLD_SIZE } from '#core/world/constant/size'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'

interface WorldCells {
  /** Every cell, row-major from (1, 1): index = (y − 1) × size + (x − 1). */
  cells: CellEntity[]
  by_id: Map<string, CellEntity>
  /** `GET /world/terrain` string, one char per cell in the same order. */
  terrain: string
}

const TERRAIN_CHAR: Record<CellType, string> = {
  [CellType.FOREST]: 'f',
  [CellType.RUINS]: 'r',
  [CellType.LAKE]: 'l',
}

const cellIndex = ({
  x, y
}: { x: number, y: number }): number => (y - 1) * WORLD_SIZE + (x - 1)

/**
 * The whole world grid, read once and kept in memory (slice 044): cells are generated once at startup (slice 005)
 * and never change. Serves the terrain string, the explored cells and the coordinates of the player's locations.
 */
export class WorldCellCache {
  private static pending: Promise<WorldCells> | null = null

  static get(repository: Repository): Promise<WorldCells> {
    if (!this.pending) {
      this.pending = this.load(repository).catch((error: unknown) => {
        this.pending = null
        throw error
      })
    }
    return this.pending
  }

  private static async load(repository: Repository): Promise<WorldCells> {
    const loaded = await repository.cell.getByBounds({
      min_x: 1,
      max_x: WORLD_SIZE,
      min_y: 1,
      max_y: WORLD_SIZE
    })
    const cells: CellEntity[] = new Array(WORLD_SIZE * WORLD_SIZE)
    for (const cell of loaded) {
      cells[cellIndex(cell.coordinates)] = cell
    }
    const ordered = cells.filter((cell): cell is CellEntity => cell !== undefined)
    const terrain = Array.from(cells, cell => (cell ? TERRAIN_CHAR[cell.type] : TERRAIN_CHAR[CellType.FOREST])).join('')

    return {
      cells: ordered,
      by_id: new Map(ordered.map(cell => [
        cell.id,
        cell
      ])),
      terrain,
    }
  }
}
