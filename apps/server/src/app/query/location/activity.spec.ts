import assert from 'assert'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { LocationActivityQuery } from '#query/location/activity'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { id } from '#shared/identification'

describe('LocationActivityQuery', () => {
  const player_id = id()
  const city_id = id()
  const other_city_id = id()
  const outpost_id = id()

  let city_wall_level: number
  let pending_defense_build: unknown
  let pending_research: unknown

  const repository = () => ({
    city: {
      get: vi.fn().mockImplementation(async (requested_id: string) => ({
        id: requested_id,
        name: requested_id === other_city_id ? 'Ferraille' : 'Nouvelle-Rouille',
        isOwnedBy: (owner: string) => owner === player_id,
      })),
    },
    outpost: {
      getById: vi.fn().mockResolvedValue({
        id: outpost_id,
        isOwnedBy: (owner: string) => owner === player_id,
      }),
    },
    building: {
      getById: vi.fn().mockResolvedValue({
        code: BuildingCode.RECYCLING_PLANT,
        level: 4,
      }),
      getLevel: vi.fn().mockImplementation(async ({ code }: { code: BuildingCode }) => code === BuildingCode.CITY_WALL ? city_wall_level : 3),
    },
    building_upgrade_queue: {
      listByCity: vi.fn().mockResolvedValue([
        { id: 'b1' },
        { id: 'b2' },
      ]),
    },
    technology: {
      get: vi.fn().mockResolvedValue({ level: 0 }),
      getById: vi.fn().mockResolvedValue({
        code: TechnologyCode.ARCHITECTURE,
        level: 2,
      }),
    },
    technology_research_queue: {
      listByPlayer: vi.fn().mockResolvedValue([
        { id: 't1' },
        { id: 't2' },
        { id: 't3' },
      ]),
    },
    troop: { getById: vi.fn().mockResolvedValue({ code: TroopCode.RECYCLER }) },
    troop_recruit_queue: { listByCity: vi.fn().mockResolvedValue([ { id: 'r1' } ]) },
    defense_build_queue: {
      listByCity: vi.fn().mockResolvedValue([
        { id: 'd1' },
        { id: 'd2' },
      ]),
    },
    movement: {
      list: vi.fn().mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
      ]),
    },
  })

  let repo: ReturnType<typeof repository>
  let job_queue: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    city_wall_level = 1
    pending_defense_build = {
      player_id,
      city_id,
      defense_code: DefenseCode.TURRET,
      remaining_count: 4,
      finish_at: 9_000,
      started_at: 1_000,
      last_progress: 1_000,
      execute_at: 3_000,
      job_id: 'job-defense',
    }
    pending_research = {
      player_id,
      city_id: other_city_id,
      technology_id: 'tech-id',
      level: 3,
      execute_at: 50_000,
      job_id: 'job-research',
    }
    repo = repository()
    job_queue = {
      getPendingBuildingUpgrade: vi.fn().mockResolvedValue({
        player_id,
        city_id,
        building_id: 'building-id',
        level: 5,
        execute_at: 20_000,
        job_id: 'job-building',
      }),
      getPendingTechnologyResearch: vi.fn().mockImplementation(async () => pending_research),
      getPendingTroopRecruitProgress: vi.fn().mockResolvedValue({
        player_id,
        city_id,
        troop_id: 'troop-id',
        remaining_count: 7,
        finish_at: 30_000,
        started_at: 10_000,
        last_progress: 10_000,
        execute_at: 12_000,
        job_id: 'job-troop',
      }),
      getPendingDefenseBuildProgress: vi.fn().mockImplementation(async () => pending_defense_build),
      getPendingTroopMovementFinish: vi.fn().mockImplementation(async ({ movement_id }: { movement_id: string }) => movement_id === 'm1'
        ? { execute_at: 40_000 }
        : null),
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repo as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue(job_queue as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const runCity = () => new LocationActivityQuery().run({
    player_id,
    location: {
      type: 'city',
      city_id
    },
  })

  const runOutpost = () => new LocationActivityQuery().run({
    player_id,
    location: {
      type: 'outpost',
      outpost_id
    },
  })

  it('returns the running fortification batch of the city', async () => {
    const result = await runCity()

    assert.deepStrictEqual(result.fortification, {
      code: DefenseCode.TURRET,
      remaining_count: 4,
      finish_at: 9_000,
      started_at: 1_000,
    })
    assert.strictEqual(job_queue.getPendingDefenseBuildProgress.mock.calls[0][0].city_id, city_id)
  })

  it('returns a null fortification when no batch runs', async () => {
    pending_defense_build = null
    const result = await runCity()

    assert.strictEqual(result.fortification, null)
  })

  it('derives fortification_available from the Enceinte level', async () => {
    city_wall_level = 1
    assert.strictEqual((await runCity()).fortification_available, true)

    city_wall_level = 0
    assert.strictEqual((await runCity()).fortification_available, false)
  })

  it('returns the queue depths (research player-wide)', async () => {
    const result = await runCity()

    assert.strictEqual(result.building_queue_depth, 2)
    assert.strictEqual(result.research_queue_depth, 3)
    assert.strictEqual(result.recruitment_queue_depth, 1)
    assert.strictEqual(result.fortification_queue_depth, 2)
    assert.strictEqual(repo.technology_research_queue.listByPlayer.mock.calls[0][0].player_id, player_id)
  })

  it('returns the city id and name of the running research', async () => {
    const result = await runCity()

    assert.strictEqual(result.research?.city_id, other_city_id)
    assert.strictEqual(result.research?.city_name, 'Ferraille')
    assert.strictEqual(result.research?.code, TechnologyCode.ARCHITECTURE)
    assert.strictEqual(result.research?.level, 2)
    assert.strictEqual(result.research?.research_at, 50_000)
  })

  it('keeps the existing fields unchanged', async () => {
    const result = await runCity()

    assert.strictEqual(result.building?.code, BuildingCode.RECYCLING_PLANT)
    assert.strictEqual(result.building?.level, 4)
    assert.strictEqual(result.building?.upgrade_at, 20_000)
    assert.deepStrictEqual(result.recruitment, {
      code: TroopCode.RECYCLER,
      remaining_count: 7,
      finish_at: 30_000,
      started_at: 10_000,
    })
    assert.deepStrictEqual(result.movements, {
      count: 1,
      next_arrive_at: 40_000,
    })
  })

  it('returns null fortification, zero city depths and no fortification for an outpost', async () => {
    const result = await runOutpost()

    assert.strictEqual(result.building, null)
    assert.strictEqual(result.building_queue_depth, 0)
    assert.strictEqual(result.recruitment, null)
    assert.strictEqual(result.recruitment_queue_depth, 0)
    assert.strictEqual(result.fortification, null)
    assert.strictEqual(result.fortification_queue_depth, 0)
    assert.strictEqual(result.fortification_available, false)
    assert.strictEqual(job_queue.getPendingDefenseBuildProgress.mock.calls.length, 0)
    // Research stays player-wide on an outpost.
    assert.strictEqual(result.research_queue_depth, 3)
    assert.strictEqual(result.research?.city_name, 'Ferraille')
  })
})
