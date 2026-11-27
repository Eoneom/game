import type { MockInstance } from 'vitest'
import { recruitTroop } from '#app/command/troop/recruit'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS } from '#app/scheduling/troop-recruit'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { RequirementError } from '#core/requirement/error'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import assert from 'assert'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'
import { PricingService } from '#core/pricing/service'
import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import { TROOP_RECRUIT_QUEUE_LIMIT } from '#core/troop/constant/recruit-queue'

describe('recruitTroop', () => {
  const player_id = id()
  const other_player_id = id()
  const requested_troop_count = 10
  const cell_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let troop: TroopEntity
  let stockUpdateOne: MockInstance
  let scheduleTroopRecruitProgress: MockInstance
  let getPendingTroopRecruitProgress: MockInstance
  let queueCreate: MockInstance
  let queue_rows: TroopRecruitQueueEntity[]
  let command_center_level: number
  let repository: Pick<Repository, 'cell' | 'city' | 'building' | 'technology' | 'troop' | 'resource_stock' | 'player' | 'troop_recruit_queue'>

  beforeEach(() => {
    city_cell = testCityCell({ cell_id })
    city = CityEntity.initCity({
      name: 'dummy',
      player_id,
      cell_id: city_cell.id
    })
    stock = testResourceStock({
      cell_id,
      plastic: 100000,
      mushroom: 100000,
      plasma: 0
    })
    troop = TroopEntity.init({
      player_id,
      cell_id,
      code: TroopCode.EXPLORER,
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopRecruitProgress = vi.fn().mockResolvedValue('job-id')
    getPendingTroopRecruitProgress = vi.fn().mockResolvedValue(null)
    queue_rows = []
    command_center_level = 0
    queueCreate = vi.fn().mockImplementation(async (row: TroopRecruitQueueEntity) => {
      queue_rows.push(row)
      return row.id
    })

    repository = {
      cell: { getById: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      player: {
        get: vi.fn().mockResolvedValue(PlayerEntity.create({
          id: player_id,
          name: 'dummy',
          faction_code: FactionCode.THE_CONFEDERATION,
          system_controlled: false
        }))
      } as unknown as Repository['player'],
      building: {
        getLevel: vi.fn().mockImplementation(async ({ code }: { code: BuildingCode }) => code === BuildingCode.COMMAND_CENTER
          ? command_center_level
          : 0)
      } as unknown as Repository['building'],
      technology: { getLevel: vi.fn().mockResolvedValue(0) } as unknown as Repository['technology'],
      troop: { getInCell: vi.fn().mockResolvedValue(troop) } as unknown as Repository['troop'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne,
      } as unknown as Repository['resource_stock'],
      troop_recruit_queue: {
        listByCity: vi.fn().mockImplementation(async () => [ ...queue_rows ]),
        countByCity: vi.fn().mockImplementation(async () => queue_rows.length),
        create: queueCreate,
        delete: vi.fn().mockImplementation(async (row_id: string) => {
          queue_rows = queue_rows.filter(row => row.id !== row_id)
        }),
      } as unknown as Repository['troop_recruit_queue'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopRecruitProgress,
      scheduleTroopRecruitProgress
    } as unknown as JobQueue)
    vi.spyOn(AppService, 'getTroopRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.CLONING_FACTORY]: 1 },
      technology: {},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player to recruit in another player city', async () => {
    await assert.rejects(
      () => recruitTroop({
        city_id: city.id,
        player_id: other_player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should prevent player to recruit when city does not have enough resources', async () => {
    const broke = testResourceStock({
      cell_id,
      plastic: 0,
      mushroom: 0,
      plasma: 0
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(broke)

    await assert.rejects(
      () => recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      }),
      new RegExp(CityError.NOT_ENOUGH_RESOURCES)
    )
  })

  it('should prevent player to recruit when recruitment is already in progress', async () => {
    getPendingTroopRecruitProgress.mockResolvedValue({
      city_id: city.id,
      troop_id: troop.id
    })

    await assert.rejects(
      () => recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      }),
      new RegExp(TroopError.ALREADY_IN_PROGRESS)
    )
  })

  describe('recruitment queue', () => {
    beforeEach(() => {
      getPendingTroopRecruitProgress.mockResolvedValue({
        city_id: city.id,
        troop_id: troop.id
      })
    })

    it('should enqueue up to three batches once the command center is built, then reject', async () => {
      command_center_level = 1

      for (let index = 0; index < TROOP_RECRUIT_QUEUE_LIMIT; index += 1) {
        await recruitTroop({
          city_id: city.id,
          player_id,
          troop_code: TroopCode.EXPLORER,
          count: requested_troop_count + index,
        })
      }

      assert.strictEqual(queueCreate.mock.calls.length, TROOP_RECRUIT_QUEUE_LIMIT)
      assert.deepStrictEqual(queue_rows.map(row => row.count), [
        10,
        11,
        12,
      ])
      assert.ok(queue_rows.every(row => row.city_id === city.id && row.player_id === player_id))

      await assert.rejects(
        () => recruitTroop({
          city_id: city.id,
          player_id,
          troop_code: TroopCode.EXPLORER,
          count: requested_troop_count,
        }),
        new RegExp(TroopError.QUEUE_FULL)
      )
    })

    it('should not charge queued batches', async () => {
      command_center_level = 1

      await recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      })

      assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
      assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
    })

    it('should enqueue without checking requirements or resources (loose validation)', async () => {
      command_center_level = 1
      vi.spyOn(AppService, 'getTroopRequirementLevels').mockResolvedValue({
        building: {},
        technology: {},
      })
      repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(testResourceStock({
        cell_id,
        plastic: 0,
        mushroom: 0,
        plasma: 0
      }))

      await recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      })

      assert.strictEqual(queueCreate.mock.calls.length, 1)
    })

    it('should still reject a troop outside the faction roster', async () => {
      command_center_level = 1

      await assert.rejects(
        () => recruitTroop({
          city_id: city.id,
          player_id,
          troop_code: TroopCode.ASH_EMISSARY,
          count: requested_troop_count,
        }),
        new RegExp(TroopError.NOT_IN_FACTION_ROSTER)
      )
      assert.strictEqual(queueCreate.mock.calls.length, 0)
    })
  })

  it('should start a stranded queued batch before queueing the new request', async () => {
    command_center_level = 1
    queue_rows = [
      TroopRecruitQueueEntity.create({
        id: id(),
        player_id,
        city_id: city.id,
        troop_code: TroopCode.EXPLORER,
        count: 3,
        created_at: 1
      })
    ]
    getPendingTroopRecruitProgress
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        city_id: city.id,
        troop_id: troop.id
      })

    await recruitTroop({
      city_id: city.id,
      player_id,
      troop_code: TroopCode.EXPLORER,
      count: requested_troop_count,
    })

    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 1)
    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls[0][0].remaining_count, 3)
    assert.deepStrictEqual(queue_rows.map(row => row.count), [ requested_troop_count ])
  })

  it('should prevent player to recruit if building requirements are not met', async () => {
    vi.spyOn(AppService, 'getTroopRequirementLevels').mockResolvedValue({
      building: {},
      technology: {},
    })

    await assert.rejects(
      () => recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      }),
      new RegExp(RequirementError.BUILDING_NOT_FULFILLED)
    )
  })

  it('should purchase the troops in the city', async () => {
    await recruitTroop({
      city_id: city.id,
      player_id,
      troop_code: TroopCode.EXPLORER,
      count: requested_troop_count,
    })

    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.ok(updated_stock.plastic < stock.plastic)
    assert.ok(updated_stock.mushroom < stock.mushroom)
  })

  describe('with a plasma-priced troop', () => {
    beforeEach(() => {
      vi.spyOn(PricingService, 'getTroopCost').mockReturnValue({
        code: TroopCode.EXPLORER,
        resource: {
          plastic: 50,
          mushroom: 80,
          plasma: 30
        },
        duration: 300
      })
    })

    it('should reject recruitment when plasma is short', async () => {
      repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(testResourceStock({
        cell_id,
        plastic: 100000,
        mushroom: 100000,
        plasma: 29
      }))

      await assert.rejects(
        () => recruitTroop({
          city_id: city.id,
          player_id,
          troop_code: TroopCode.EXPLORER,
          count: requested_troop_count,
        }),
        new RegExp(CityError.NOT_ENOUGH_RESOURCES)
      )
      assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
      assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 0)
    })

    it('should debit plasma with plastic and mushroom', async () => {
      repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(testResourceStock({
        cell_id,
        plastic: 100000,
        mushroom: 100000,
        plasma: 100
      }))

      await recruitTroop({
        city_id: city.id,
        player_id,
        troop_code: TroopCode.EXPLORER,
        count: requested_troop_count,
      })

      const updated_stock = stockUpdateOne.mock.calls[0][0]
      assert.strictEqual(updated_stock.plastic, 99950)
      assert.strictEqual(updated_stock.mushroom, 99920)
      assert.strictEqual(updated_stock.plasma, 70)
    })
  })

  it('should schedule troop recruit progress job', async () => {
    const { duration } = PricingService.getTroopCost({
      code: TroopCode.EXPLORER,
      count: requested_troop_count,
      cloning_factory_level: 0,
      replication_catalyst_level: 0,
    })

    await recruitTroop({
      city_id: city.id,
      player_id,
      troop_code: TroopCode.EXPLORER,
      count: requested_troop_count,
    })

    assert.strictEqual(scheduleTroopRecruitProgress.mock.calls.length, 1)
    const scheduled = scheduleTroopRecruitProgress.mock.calls[0][0]
    assert.strictEqual(scheduled.player_id, player_id)
    assert.strictEqual(scheduled.city_id, city.id)
    assert.strictEqual(scheduled.troop_id, troop.id)
    assert.strictEqual(scheduled.remaining_count, requested_troop_count)
    assert.strictEqual(scheduled.finish_at - scheduled.started_at, duration * 1000)
    assert.strictEqual(scheduled.last_progress, scheduled.started_at)
    assert.ok(scheduled.execute_at >= scheduled.started_at + TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS
      || scheduled.execute_at === scheduled.finish_at)
    assert.ok(scheduled.execute_at <= scheduled.finish_at)
  })
})
