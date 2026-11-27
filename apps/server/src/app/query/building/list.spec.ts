import type { MockInstance } from 'vitest'
import { BuildingListQuery } from '#app/query/building/list'
import { BuildingGetQuery } from '#app/query/building/get'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import type { BuildingListEntry } from '#app/query/building/list'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingEntity } from '#core/building/entity'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { id } from '#shared/identification'

describe('BuildingListQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const technology_id = id()
  const building_id_idle = id()
  const building_id_upgrade = id()
  let city: CityEntity
  let architecture: TechnologyEntity
  let b_idle: BuildingEntity
  let b_upgrade: BuildingEntity
  let repository: Pick<Repository, 'city' | 'building' | 'technology' | 'building_upgrade_queue'>
  let getPendingBuildingUpgrade: MockInstance

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'c',
      player_id,
      cell_id: id()
    })
    architecture = TechnologyEntity.create({
      id: technology_id,
      player_id,
      code: TechnologyCode.ARCHITECTURE,
      level: 1
    })
    b_idle = BuildingEntity.create({
      id: building_id_idle,
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB,
      level: 1
    })
    b_upgrade = BuildingEntity.create({
      id: building_id_upgrade,
      city_id: city.id,
      code: BuildingCode.CLONING_FACTORY,
      level: 0
    })

    getPendingBuildingUpgrade = vi.fn().mockResolvedValue({
      player_id,
      city_id: city.id,
      building_id: building_id_upgrade,
      level: 0,
      execute_at: 10_000,
      job_id: 'job'
    })

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      building: {
        list: vi.fn().mockResolvedValue([
          b_upgrade,
          b_idle
        ])
      } as unknown as Repository['building'],
      technology: { get: vi.fn().mockResolvedValue(architecture) } as unknown as Repository['technology'],
      building_upgrade_queue: {
        listByCity: vi.fn().mockResolvedValue([])
      } as unknown as Repository['building_upgrade_queue']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingBuildingUpgrade } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when city is not owned by player', async () => {
    const other = CityEntity.initCity({
      name: 'x',
      player_id: other_player_id,
      cell_id: id()
    })
    ;(repository.city.get as unknown as MockInstance).mockResolvedValue(other)

    await expect(new BuildingListQuery().run({
      city_id: other.id,
      player_id
    })).rejects.toThrow(CityError.NOT_OWNER)
  })

  it('returns sorted buildings with upgrade fields when upgrade in progress', async () => {
    const result = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })

    expect(result.buildings).toHaveLength(2)
    expect(result.upgrade_queue).toEqual([])
    const upgrading = result.buildings.find((b): b is Extract<BuildingListEntry, { upgrade_at: number }> => b.id === b_upgrade.id && 'upgrade_at' in b)
    expect(upgrading).toBeDefined()
    expect(upgrading!.upgrade_at).toBe(10_000)
    expect(upgrading!.upgrade_started_at).toBeDefined()
    const idle = result.buildings.find(b => b.id === b_idle.id)
    expect(idle).toBeDefined()
    expect(idle && !('upgrade_at' in idle)).toBe(true)
  })

  it('returns upgrade queue entries in FIFO order', async () => {
    const queue_item = {
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.RESEARCH_LAB,
      created_at: 1
    }
    ;(repository.building_upgrade_queue.listByCity as unknown as MockInstance).mockResolvedValue([queue_item])

    const result = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })

    expect(result.upgrade_queue).toHaveLength(1)
    expect(result.upgrade_queue[0]).toMatchObject({
      id: queue_item.id,
      building_code: BuildingCode.RESEARCH_LAB,
      duration_seconds: expect.any(Number),
      start_at: 10_000,
      finish_at: expect.any(Number),
    })
    expect(result.upgrade_queue[0].finish_at).toBeGreaterThan(result.upgrade_queue[0].start_at)
  })

  it('carries the upgrade cost and requirement of level + 1 on every entry (slice 043)', async () => {
    const result = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })

    for (const entry of result.buildings) {
      expect(entry.upgrade_cost).toEqual(PricingService.getBuildingLevelCost({
        code: entry.code,
        level: entry.level + 1,
        architecture_level: architecture.level
      }))
      expect(entry.requirement).toEqual(RequirementService.getBuildingRequirement({ building_code: entry.code }))
    }
    const upgrading = result.buildings.find(b => b.id === b_upgrade.id)
    expect(upgrading && 'upgrade_at' in upgrading && upgrading.upgrade_started_at)
      .toBe(10_000 - upgrading!.upgrade_cost.duration * 1000)
  })

  it('prices entries like the details query', async () => {
    const wall = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.CITY_WALL,
      level: 3
    })
    ;(repository.building.list as unknown as MockInstance).mockResolvedValue([ wall ])
    ;(repository.building as unknown as { getInCity: MockInstance }).getInCity = vi.fn().mockResolvedValue(wall)

    const list = await new BuildingListQuery().run({
      city_id: city.id,
      player_id
    })
    const details = await new BuildingGetQuery().run({
      city_id: city.id,
      player_id,
      building_code: BuildingCode.CITY_WALL
    })

    expect(list.buildings[0].upgrade_cost).toEqual(details.cost)
    expect(list.buildings[0].requirement).toEqual(details.requirement)
  })
})
