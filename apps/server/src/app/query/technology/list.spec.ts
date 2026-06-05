import type { MockInstance } from 'vitest'
import { TechnologyListQuery } from '#app/query/technology/list'
import type { TechnologyListEntry } from '#app/query/technology/list'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { TechnologyEntity } from '#core/technology/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { BuildingCode } from '#core/building/constant/code'
import { id } from '#shared/identification'

describe('TechnologyListQuery', () => {
  const player_id = id()
  const city_id = id()
  const technology_id_idle = id()
  const technology_id_research = id()
  let t_idle: TechnologyEntity
  let t_research: TechnologyEntity
  let repository: Pick<Repository, 'technology' | 'building'>
  let getPendingTechnologyResearch: MockInstance

  beforeEach(() => {
    t_idle = TechnologyEntity.create({
      id: technology_id_idle,
      player_id,
      code: TechnologyCode.ARCHITECTURE,
      level: 1
    })
    t_research = TechnologyEntity.create({
      id: technology_id_research,
      player_id,
      code: TechnologyCode.REPLICATION_CATALYST,
      level: 0
    })

    getPendingTechnologyResearch = vi.fn().mockResolvedValue({
      player_id,
      city_id,
      technology_id: technology_id_research,
      level: 0,
      execute_at: 10_000,
      job_id: 'job'
    })

    repository = {
      technology: {
        list: vi.fn().mockResolvedValue([
          t_research,
          t_idle
        ])
      } as unknown as Repository['technology'],
      building: {
        getLevel: vi.fn().mockResolvedValue(1)
      } as unknown as Repository['building']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingTechnologyResearch } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns technologies with research fields when research in progress', async () => {
    const result = await new TechnologyListQuery().run({ player_id })

    expect(result.technologies).toHaveLength(2)
    const researching = result.technologies.find(
      (t): t is Extract<TechnologyListEntry, { research_at: number }> =>
        t.id === t_research.id && 'research_at' in t
    )
    expect(researching).toBeDefined()
    expect(researching!.research_at).toBe(10_000)
    expect(researching!.research_started_at).toBeDefined()
    const idle = result.technologies.find(t => t.id === t_idle.id)
    expect(idle).toBeDefined()
    expect(idle && !('research_at' in idle)).toBe(true)
    expect(repository.building.getLevel).toHaveBeenCalledWith({
      city_id,
      code: BuildingCode.RESEARCH_LAB
    })
  })

  it('returns idle technologies when no research pending', async () => {
    getPendingTechnologyResearch.mockResolvedValue(null)

    const result = await new TechnologyListQuery().run({ player_id })

    expect(result.technologies.every(t => !('research_at' in t))).toBe(true)
  })
})
