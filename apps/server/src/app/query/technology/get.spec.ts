import { TechnologyGetQuery } from '#app/query/technology/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { id } from '#shared/identification'

describe('TechnologyGetQuery', () => {
  const player_id = id()
  const city_id = id()
  let technology: TechnologyEntity
  let repository: Pick<Repository, 'technology' | 'building'>

  beforeEach(() => {
    technology = TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.ARCHITECTURE,
      level: 0
    })
    repository = {
      technology: { get: vi.fn().mockResolvedValue(technology) } as unknown as Repository['technology'],
      building: { getLevel: vi.fn().mockResolvedValue(1) } as unknown as Repository['building']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns technology, cost and requirement using research lab level', async () => {
    const result = await new TechnologyGetQuery().run({
      city_id,
      technology_code: TechnologyCode.ARCHITECTURE,
      player_id
    })

    expect(result.technology).toBe(technology)
    expect(result.cost).toBeDefined()
    expect(result.requirement).toBeDefined()
    expect(repository.building.getLevel).toHaveBeenCalledWith({
      city_id,
      code: BuildingCode.RESEARCH_LAB
    })
  })
})
