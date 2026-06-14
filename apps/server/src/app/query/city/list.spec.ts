import { CityListQuery } from '#app/query/city/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CityService } from '#core/city/service'
import { id } from '#shared/identification'

describe('CityListQuery', () => {
  const player_id = id()
  let cities: CityEntity[]
  let repository: Pick<Repository, 'city'>

  beforeEach(() => {
    cities = [
      CityEntity.initCity({
        name: 'a',
        player_id,
        cell_id: id()
      })
    ]
    repository = { city: { list: vi.fn().mockResolvedValue(cities) } as unknown as Repository['city'] }
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

  it('returns count_limit from CityService', async () => {
    const result = await new CityListQuery().run({ player_id })

    expect(result.count_limit).toBe(CityService.getCountLimit())
  })
})
