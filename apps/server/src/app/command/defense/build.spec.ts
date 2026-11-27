import type { MockInstance } from 'vitest'
import assert from 'assert'
import { buildDefense } from '#app/command/defense/build'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import {
  JobQueue, PendingDefenseBuildProgress 
} from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DEFENSE_BUILD_QUEUE_LIMIT } from '#core/defense/constant/build-queue'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { DefenseError } from '#core/defense/error'
import { TechnologyCode } from '#core/technology/constant/code'
import {
  testCityCell, testResourceStock
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('buildDefense', () => {
  const player_id = id()
  const cell_id = id()
  let city: CityEntity
  let city_wall_level: number
  let defenses: DefenseEntity[]
  let queue_rows: DefenseBuildQueueEntity[]
  let pending: PendingDefenseBuildProgress | null
  let stockUpdateOne: MockInstance
  let scheduleDefenseBuildProgress: MockInstance
  let queueCreate: MockInstance

  function pendingBatch(code: DefenseCode, remaining_count: number): PendingDefenseBuildProgress {
    return {
      player_id,
      city_id: city.id,
      defense_code: code,
      remaining_count,
      finish_at: 100_000,
      started_at: 0,
      last_progress: 0,
      execute_at: 5_000,
      job_id: 'job-id'
    }
  }

  beforeEach(() => {
    const city_cell = testCityCell({ cell_id })
    city = CityEntity.initCity({
      name: 'walled',
      player_id,
      cell_id: city_cell.id
    })
    city_wall_level = 1
    defenses = []
    queue_rows = []
    pending = null
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleDefenseBuildProgress = vi.fn().mockImplementation(async (data: PendingDefenseBuildProgress) => {
      pending = {
        ...data,
        job_id: 'job-id'
      }
      return 'job-id'
    })
    queueCreate = vi.fn().mockImplementation(async (row: DefenseBuildQueueEntity) => {
      queue_rows.push(row)
      return row.id
    })

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      cell: { getById: vi.fn().mockResolvedValue(city_cell) },
      building: { getLevel: vi.fn().mockImplementation(async ({ code }: { code: BuildingCode }) => code === BuildingCode.CITY_WALL ? city_wall_level : 0) },
      defense: { listByCity: vi.fn().mockImplementation(async () => defenses) },
      defense_build_queue: {
        listByCity: vi.fn().mockImplementation(async () => [ ...queue_rows ]),
        countByCity: vi.fn().mockImplementation(async () => queue_rows.length),
        create: queueCreate,
        delete: vi.fn().mockImplementation(async (row_id: string) => {
          queue_rows = queue_rows.filter(row => row.id !== row_id)
        }),
      },
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(testResourceStock({
          cell_id,
          plastic: 100_000,
          mushroom: 100_000,
          plasma: 1_000
        })),
        updateOne: stockUpdateOne,
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingDefenseBuildProgress: vi.fn().mockImplementation(async () => pending),
      scheduleDefenseBuildProgress,
    } as unknown as JobQueue)
    vi.spyOn(AppService, 'getDefenseRequirementLevels').mockResolvedValue({
      building: {
        [BuildingCode.CITY_WALL]: 5,
        [BuildingCode.CENTRAL_INDUCTOR]: 1,
      },
      technology: { [TechnologyCode.FORTIFICATION]: 3 },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects building in another player city', async () => {
    await assert.rejects(buildDefense({
      player_id: id(),
      city_id: city.id,
      defense_code: DefenseCode.RAMPART,
      count: 1
    }), new Error(CityError.NOT_OWNER))
  })

  it('starts the batch and pays for it when nothing is being built', async () => {
    await buildDefense({
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.RAMPART,
      count: 2
    })

    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 1)
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.RAMPART)
    assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].remaining_count, 2)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 100_000 - 2 * 800)
    assert.strictEqual(stockUpdateOne.mock.calls[0][0].mushroom, 100_000 - 2 * 400)
  })

  it('charges plasma for plasma-priced defenses', async () => {
    city_wall_level = 5
    await buildDefense({
      player_id,
      city_id: city.id,
      defense_code: DefenseCode.PLASMA_BATTERY,
      count: 2
    })

    assert.strictEqual(stockUpdateOne.mock.calls[0][0].plasma, 1_000 - 2 * 300)
  })

  describe('capacity (20 points per Enceinte level)', () => {
    it('rejects any build without an Enceinte', async () => {
      city_wall_level = 0
      await assert.rejects(buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      }), new Error(DefenseError.CAPACITY_EXCEEDED))
    })

    it('accepts exactly 20 × level points and rejects one more', async () => {
      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.TURRET,
        count: 10
      })
      await assert.rejects(buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      }), new Error(DefenseError.CAPACITY_EXCEEDED))
    })

    it('counts existing defenses, the active batch and queued rows', async () => {
      defenses = [
        DefenseEntity.create({
          id: id(),
          player_id,
          city_id: city.id,
          code: DefenseCode.RAMPART,
          count: 10
        })
      ]
      pending = pendingBatch(DefenseCode.TURRET, 3)
      queue_rows = [
        DefenseBuildQueueEntity.create({
          id: id(),
          player_id,
          city_id: city.id,
          defense_code: DefenseCode.MINEFIELD,
          count: 3,
          created_at: 1
        })
      ]
      // 10 + 6 + 3 = 19 points used or queued out of 20.
      await assert.rejects(buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.TURRET,
        count: 1
      }), new Error(DefenseError.CAPACITY_EXCEEDED))

      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      })
      assert.strictEqual(queue_rows.length, 2)
    })
  })

  describe('fortification queue', () => {
    beforeEach(() => {
      city_wall_level = 5
      pending = pendingBatch(DefenseCode.RAMPART, 2)
    })

    it(`enqueues up to ${DEFENSE_BUILD_QUEUE_LIMIT} waiting batches without paying, then fails with queue-full`, async () => {
      for (let index = 0; index < DEFENSE_BUILD_QUEUE_LIMIT; index++) {
        await buildDefense({
          player_id,
          city_id: city.id,
          defense_code: DefenseCode.RAMPART,
          count: 1
        })
      }

      assert.strictEqual(queue_rows.length, DEFENSE_BUILD_QUEUE_LIMIT)
      assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)

      await assert.rejects(buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      }), new Error(DefenseError.QUEUE_FULL))
    })

    it('does not check requirements or resources when enqueuing', async () => {
      vi.spyOn(AppService, 'getDefenseRequirementLevels').mockResolvedValue({
        building: {},
        technology: {},
      })

      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.PLASMA_BATTERY,
        count: 1
      })

      assert.strictEqual(queue_rows.length, 1)
      assert.strictEqual(queue_rows[0].defense_code, DefenseCode.PLASMA_BATTERY)
    })

    it('starts a queued row left behind by a failed job before the new batch', async () => {
      pending = null
      queue_rows = [
        DefenseBuildQueueEntity.create({
          id: id(),
          player_id,
          city_id: city.id,
          defense_code: DefenseCode.MINEFIELD,
          count: 4,
          created_at: 1
        })
      ]

      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      })

      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.MINEFIELD)
      assert.strictEqual(queue_rows.length, 1)
      assert.strictEqual(queue_rows[0].defense_code, DefenseCode.RAMPART)
    })
  })
})
