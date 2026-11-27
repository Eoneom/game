import { CityListQuery } from '#app/query/city/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CityService } from '#core/city/service'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'

describe('CityListQuery', () => {
  const player_id = id()
  let cities: CityEntity[]
  let cell: CellEntity
  let repository: Pick<Repository, 'city' | 'cell'>

  beforeEach(() => {
    cities = [
      CityEntity.initCity({
        name: 'a',
        player_id,
        cell_id: id()
      })
    ]
    cell = CellEntity.create({
      id: cities[0].cell_id,
      coordinates: {
        x: 7,
        y: 9
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 0
      },
      solar_coefficient: 1,
    })
    repository = {
      city: { list: vi.fn().mockResolvedValue(cities) } as unknown as Repository['city'],
      cell: { getById: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns cities from repository', async () => {
    const result = await new CityListQuery().run({ player_id })

    expect(result.cities).toBe(cities)
    expect(repository.city.list).toHaveBeenCalledWith({ player_id })
  })

  it('returns the cell of each city (coordinates, slice 045)', async () => {
    const result = await new CityListQuery().run({ player_id })

    expect(result.cells).toEqual([ cell ])
    expect(repository.cell.getById).toHaveBeenCalledWith(cities[0].cell_id)
  })

  it('returns count_limit from CityService', async () => {
    const result = await new CityListQuery().run({ player_id })

    expect(result.count_limit).toBe(CityService.getCountLimit())
  })
})
