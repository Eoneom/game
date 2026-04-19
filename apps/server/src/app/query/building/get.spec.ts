import type { MockInstance } from 'vitest'
import { BuildingGetQuery } from '#app/query/building/get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingEntity } from '#core/building/entity'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { id } from '#shared/identification'

describe('BuildingGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let building: BuildingEntity
  let architecture: TechnologyEntity
  let repository: Pick<Repository, 'city' | 'building' | 'technology'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'c',
      player_id
    })
    building = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB,
      level: 1
    })
    architecture = TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.ARCHITECTURE,
      level: 2
    })

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      building: { getInCity: vi.fn().mockResolvedValue(building) } as unknown as Repository['building'],
      technology: { get: vi.fn().mockResolvedValue(architecture) } as unknown as Repository['technology']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingBuildingUpgrade: vi.fn().mockResolvedValue(null) } as unknown as import('#adapter/job-queue').JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when city is not owned by player', async () => {
    const other = CityEntity.initCity({
      name: 'x',
      player_id: other_player_id
    })
    ;(repository.city.get as MockInstance).mockResolvedValue(other)

    await expect(new BuildingGetQuery().run({
      city_id: other.id,
      building_code: BuildingCode.RESEARCH_LAB,
      player_id
    })).rejects.toThrow(CityError.NOT_OWNER)
  })

  it('returns building, cost, requirement and empty metadata for non-production building', async () => {
    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.RESEARCH_LAB,
      player_id
    })

    expect(result.building).toBe(building)
    expect(result.metadata).toEqual({})
    expect(result.requirement).toBeDefined()
    expect(result.cost).toBeDefined()
    expect(repository.building.getInCity).toHaveBeenCalledWith({
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB
    })
  })
})
