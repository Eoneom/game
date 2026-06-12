import { WorldGetCellsQuery } from '#app/query/world/get-cells'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { WorldError } from '#core/world/error'
import { id } from '#shared/identification'

describe('WorldGetCellsQuery', () => {
  const player_id = id()
  const bounds = {
    min_x: 1,
    max_x: 5,
    min_y: 1,
    max_y: 5
  }
  const cell_id_1 = id()
  const cell_id_2 = id()
  let cells: CellEntity[]
  let repository: Pick<Repository, 'cell' | 'exploration'>

  beforeEach(() => {
    cells = [
      CellEntity.create({
        id: cell_id_1,
        coordinates: {
          x: 1,
          y: 1
        },
        type: CellType.FOREST,
        resource_coefficient: {
          plastic: 1,
          mushroom: 1,
          plasma: 0
        },
        solar_coefficient: 1
      })
    ]
    repository = {
      cell: { getByBounds: vi.fn().mockResolvedValue(cells) } as unknown as Repository['cell'],
      exploration: {
        get: vi.fn().mockResolvedValue({
          cell_ids: [
            cell_id_1,
            cell_id_2
          ]
        })
      } as unknown as Repository['exploration']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns cells in bounds and explored ids', async () => {
    const result = await new WorldGetCellsQuery().run({
      ...bounds,
      player_id
    })

    expect(result.cells).toBe(cells)
    expect(result.explored_cell_ids).toEqual([
      cell_id_1,
      cell_id_2
    ])
    expect(repository.cell.getByBounds).toHaveBeenCalledWith(bounds)
    expect(repository.exploration.get).toHaveBeenCalledWith({ player_id })
  })

  it('rejects invalid bounds', async () => {
    await expect(new WorldGetCellsQuery().run({
      min_x: 1,
      max_x: 50,
      min_y: 1,
      max_y: 1,
      player_id
    })).rejects.toThrow(WorldError.INVALID_BOUNDS)
  })
})
