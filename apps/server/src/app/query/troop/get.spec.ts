import type { MockInstance } from 'vitest'
import { TroopGetQuery } from '#app/query/troop/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { id } from '#shared/identification'

describe('TroopGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const troop_id = id()
  const movement_id = id()
  const cell_id = id()
  const city_id = id()
  let troop_no_cell: TroopEntity
  let repository: Pick<Repository, 'troop' | 'technology' | 'cell' | 'building'>

  beforeEach(() => {
    troop_no_cell = TroopEntity.create({
      id: troop_id,
      code: TroopCode.EXPLORER,
      count: 5,
      player_id,
      cell_id: null,
      movement_id,
      ongoing_recruitment: null
    })
    repository = {
      troop: { getById: vi.fn().mockResolvedValue(troop_no_cell) } as unknown as Repository['troop'],
      technology: { getLevel: vi.fn().mockResolvedValue(0) } as unknown as Repository['technology'],
      cell: { getById: vi.fn() } as unknown as Repository['cell'],
      building: { getLevel: vi.fn() } as unknown as Repository['building']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when troop is not owned by player', async () => {
    const other = TroopEntity.create({
      ...troop_no_cell,
      player_id: other_player_id
    })
    ;(repository.troop.getById as MockInstance).mockResolvedValue(other)

    await expect(new TroopGetQuery().run({
      troop_id,
      player_id 
    })).rejects.toThrow(TroopError.NOT_OWNER)
  })

  it('returns troop and pricing without cell when troop has no cell_id', async () => {
    const result = await new TroopGetQuery().run({
      troop_id,
      player_id 
    })

    expect(result.troop).toBe(troop_no_cell)
    expect(result.cost).toBeDefined()
    expect(result.requirement).toBeDefined()
    expect(repository.cell.getById).not.toHaveBeenCalled()
  })

  it('uses cloning factory level when troop is on a city cell', async () => {
    const cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 0,
        y: 0,
        sector: 1 
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      },
      city_id
    })
    const troop_in_city = TroopEntity.create({
      id: troop_id,
      code: TroopCode.EXPLORER,
      count: 1,
      player_id,
      cell_id: cell.id,
      movement_id: null,
      ongoing_recruitment: null
    })
    ;(repository.troop.getById as MockInstance).mockResolvedValue(troop_in_city)
    repository.cell = { getById: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell']
    repository.building = { getLevel: vi.fn().mockResolvedValue(3) } as unknown as Repository['building']

    await new TroopGetQuery().run({
      troop_id,
      player_id 
    })

    expect(repository.building.getLevel).toHaveBeenCalledWith({
      city_id,
      code: BuildingCode.CLONING_FACTORY
    })
  })
})
