import { WorldGetCellsQuery } from '#app/query/world/get-cells'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { WorldError } from '#core/world/error'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { PlayerEntity } from '#core/player/entity'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
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
  let repository: Pick<Repository, 'cell' | 'exploration' | 'player' | 'city' | 'outpost'>

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
      } as unknown as Repository['exploration'],
      player: {
        get: vi.fn().mockImplementation(async (requested_id: string) => PlayerEntity.create({
          id: requested_id,
          name: 'player',
          faction_code: requested_id === player_id
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
          system_controlled: false
        })),
        listByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(requested_id => PlayerEntity.create({
          id: requested_id,
          name: 'player',
          faction_code: requested_id === player_id
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
          system_controlled: false
        }))),
      } as unknown as Repository['player'],
      city: {
        listInBounds: vi.fn().mockResolvedValue([
          {
            city: CityEntity.create({
              id: id(),
              player_id: id(),
              name: 'Rome',
              cell_id: cell_id_1
            }),
            coordinates: {
              x: 1,
              y: 1
            }
          }
        ])
      } as unknown as Repository['city'],
      outpost: {
        listInBounds: vi.fn().mockResolvedValue([
          {
            outpost: OutpostEntity.create({
              id: id(),
              player_id,
              cell_id: cell_id_2,
              type: OutpostType.TEMPORARY
            }),
            coordinates: {
              x: 2,
              y: 2
            }
          }
        ])
      } as unknown as Repository['outpost']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns cells in bounds, explored ids, and settlements', async () => {
    const result = await new WorldGetCellsQuery().run({
      ...bounds,
      player_id
    })

    expect(result.cells).toBe(cells)
    expect(result.explored_cell_ids).toEqual([
      cell_id_1,
      cell_id_2
    ])
    expect(result.viewer_faction_code).toBe(FactionCode.THE_CONFEDERATION)
    expect(result.settlements.cities).toHaveLength(1)
    expect(result.settlements.outposts).toHaveLength(1)
    expect(result.settlements.outposts[0].faction_code).toBe(FactionCode.THE_CONFEDERATION)
    expect(repository.cell.getByBounds).toHaveBeenCalledWith(bounds)
    expect(repository.exploration.get).toHaveBeenCalledWith({ player_id })
    expect(repository.city.listInBounds).toHaveBeenCalledWith(bounds)
    expect(repository.outpost.listInBounds).toHaveBeenCalledWith(bounds)
  })

  it('loads settlements but skips exploration when detail is terrain', async () => {
    const result = await new WorldGetCellsQuery().run({
      ...bounds,
      player_id,
      detail: 'terrain',
    })

    expect(result.cells).toBe(cells)
    expect(result.settlements.cities).toHaveLength(1)
    expect(result.explored_cell_ids).toEqual([])
    expect(repository.exploration.get).not.toHaveBeenCalled()
    expect(repository.city.listInBounds).toHaveBeenCalledWith(bounds)
    expect(repository.outpost.listInBounds).toHaveBeenCalledWith(bounds)
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
