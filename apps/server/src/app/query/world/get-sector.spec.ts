import { WorldGetSectorQuery } from '#app/query/world/get-sector'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'

describe('WorldGetSectorQuery', () => {
  const player_id = id()
  const sector = 3
  const cell_id_1 = id()
  const cell_id_2 = id()
  let cells: CellEntity[]
  let repository: Pick<Repository, 'cell' | 'exploration'>

  beforeEach(() => {
    cells = [
      CellEntity.create({
        id: cell_id_1,
        coordinates: {
          x: 0,
          y: 0,
          sector 
        },
        type: CellType.FOREST,
        resource_coefficient: {
          plastic: 1,
          mushroom: 1 
        }
      })
    ]
    repository = {
      cell: { getSector: vi.fn().mockResolvedValue(cells) } as unknown as Repository['cell'],
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

  it('returns sector cells and explored ids', async () => {
    const result = await new WorldGetSectorQuery().run({
      sector,
      player_id 
    })

    expect(result.cells).toBe(cells)
    expect(result.explored_cell_ids).toEqual([
      cell_id_1,
      cell_id_2 
    ])
    expect(repository.cell.getSector).toHaveBeenCalledWith({ sector })
    expect(repository.exploration.get).toHaveBeenCalledWith({ player_id })
  })
})
