import { TechnologyGetQuery } from '#app/query/technology/get'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
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
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTechnologyResearch: vi.fn().mockResolvedValue(null)
    } as unknown as JobQueue)
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
    expect(result.research_at).toBeUndefined()
    expect(repository.building.getLevel).toHaveBeenCalledWith({
      city_id,
      code: BuildingCode.RESEARCH_LAB
    })
  })

  it('includes research timers when pending job matches technology', async () => {
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTechnologyResearch: vi.fn().mockResolvedValue({
        player_id,
        city_id,
        technology_id: technology.id,
        level: 0,
        execute_at: 10_000,
        job_id: 'job'
      })
    } as unknown as JobQueue)

    const result = await new TechnologyGetQuery().run({
      city_id,
      technology_code: TechnologyCode.ARCHITECTURE,
      player_id
    })

    expect(result.research_at).toBe(10_000)
    expect(result.research_started_at).toBeDefined()
  })
})
