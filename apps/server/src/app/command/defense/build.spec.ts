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
import { FactionCode } from '#core/faction/constant/code'
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
  let faction_code: FactionCode
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
    faction_code = FactionCode.THE_CONFEDERATION
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
      player: { get: vi.fn().mockImplementation(async () => ({ faction_code })) },
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

  describe('faction defenses (slice 036)', () => {
    it('rejects a Symbiose defense for a Confederation player', async () => {
      for (const defense_code of [
        DefenseCode.MYCELIUM_WALL,
        DefenseCode.SPORE_CLOUD
      ]) {
        await assert.rejects(buildDefense({
          player_id,
          city_id: city.id,
          defense_code,
          count: 1
        }), new Error(DefenseError.NOT_IN_FACTION_ROSTER))
      }
      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
    })

    it('lets a Symbiose player build mycelium walls and common defenses', async () => {
      faction_code = FactionCode.THE_SYMBIOSIS
      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.MYCELIUM_WALL,
        count: 2
      })

      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.MYCELIUM_WALL)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 100_000 - 2 * 400)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].mushroom, 100_000 - 2 * 700)

      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAMPART,
        count: 1
      })
      assert.strictEqual(queue_rows.length, 1)
    })
  })

  describe('faction defenses (slice 037)', () => {
    it('rejects the Bastion defenses for Confederation and Symbiose players', async () => {
      for (const player_faction of [
        FactionCode.THE_CONFEDERATION,
        FactionCode.THE_SYMBIOSIS
      ]) {
        faction_code = player_faction
        for (const defense_code of [
          DefenseCode.FIELD_ARTILLERY,
          DefenseCode.BARBED_WIRE
        ]) {
          await assert.rejects(buildDefense({
            player_id,
            city_id: city.id,
            defense_code,
            count: 1
          }), new Error(DefenseError.NOT_IN_FACTION_ROSTER))
        }
      }
      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
    })

    it('lets a Bastion player build barbed wire', async () => {
      faction_code = FactionCode.THE_BASTION_ORDER
      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.BARBED_WIRE,
        count: 3
      })

      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.BARBED_WIRE)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 100_000 - 3 * 200)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].mushroom, 100_000 - 3 * 100)
    })
  })

  describe('faction defenses (slice 039)', () => {
    it('rejects the Confederation defenses for Symbiose and Bastion players', async () => {
      for (const player_faction of [
        FactionCode.THE_SYMBIOSIS,
        FactionCode.THE_BASTION_ORDER
      ]) {
        faction_code = player_faction
        for (const defense_code of [
          DefenseCode.RAILGUN,
          DefenseCode.HOLO_DECOY
        ]) {
          await assert.rejects(buildDefense({
            player_id,
            city_id: city.id,
            defense_code,
            count: 1
          }), new Error(DefenseError.NOT_IN_FACTION_ROSTER))
        }
      }
      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls.length, 0)
    })

    it('lets a Confederation player build railguns, paid in plasma too', async () => {
      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.RAILGUN,
        count: 2
      })

      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.RAILGUN)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 100_000 - 2 * 1400)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].mushroom, 100_000 - 2 * 800)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].plasma, 1_000 - 2 * 100)
    })

    it('lets a Confederation player build holo decoys', async () => {
      await buildDefense({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.HOLO_DECOY,
        count: 5
      })

      assert.strictEqual(scheduleDefenseBuildProgress.mock.calls[0][0].defense_code, DefenseCode.HOLO_DECOY)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].plastic, 100_000 - 5 * 150)
      assert.strictEqual(stockUpdateOne.mock.calls[0][0].mushroom, 100_000 - 5 * 150)
    })
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
