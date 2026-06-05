import type { MockInstance } from 'vitest'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { AppEventBus } from '#app/event-bus'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import assert from 'assert'
import { id } from '#shared/identification'
import { now } from '#shared/time'

describe('finishBuildingUpgrade', () => {
  const player_id = id()
  const other_player_id = id()
  const upgraded_at = 1_700_000_000_000
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let building_to_finish: BuildingEntity
  let next_building: BuildingEntity
  let architecture: TechnologyEntity
  let stock: ReturnType<typeof testResourceStock>
  let buildingUpdateOne: MockInstance
  let stockUpdateOne: MockInstance
  let scheduleBuildingUpgradeFinish: MockInstance
  let queueListByCity: MockInstance
  let queueDelete: MockInstance
  let emit: MockInstance
  let repository: Pick<
    Repository,
    'building' | 'city' | 'cell' | 'resource_stock' | 'technology' | 'building_upgrade_queue'
  >

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    city_cell = testCityCell({ city_id: city.id })
    building_to_finish = BuildingEntity.create({
      id: id(),
      level: 0,
      code: BuildingCode.MUSHROOM_FARM,
      city_id: city.id
    })
    next_building = BuildingEntity.create({
      id: id(),
      level: 0,
      code: BuildingCode.RECYCLING_PLANT,
      city_id: city.id
    })
    architecture = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 0
    })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: 30000,
      mushroom: 30000
    })

    buildingUpdateOne = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleBuildingUpgradeFinish = vi.fn().mockResolvedValue('job-id')
    queueListByCity = vi.fn().mockResolvedValue([])
    queueDelete = vi.fn().mockResolvedValue(undefined)
    emit = vi.fn()

    repository = {
      building: {
        getById: vi.fn().mockResolvedValue(building_to_finish),
        updateOne: buildingUpdateOne,
        get: vi.fn().mockImplementation(async ({ code }: { code: BuildingCode }) => {
          if (code === BuildingCode.RECYCLING_PLANT) {
            return next_building
          }
          if (code === BuildingCode.CLONING_FACTORY) {
            return BuildingEntity.create({
              id: id(),
              level: 0,
              code: BuildingCode.CLONING_FACTORY,
              city_id: city.id
            })
          }
          return next_building
        }),
        getTotalLevels: vi.fn().mockResolvedValue(1),
        list: vi.fn().mockResolvedValue([])
      } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: {
        getCityCell: vi.fn().mockResolvedValue(city_cell),
        getCityCellsCount: vi.fn().mockResolvedValue(10)
      } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock'],
      technology: {
        get: vi.fn().mockResolvedValue(architecture),
        list: vi.fn().mockResolvedValue([
          TechnologyEntity.create({
            id: id(),
            code: TechnologyCode.ARCHITECTURE,
            player_id,
            level: 2
          })
        ])
      } as unknown as Repository['technology'],
      building_upgrade_queue: {
        listByCity: queueListByCity,
        delete: queueDelete
      } as unknown as Repository['building_upgrade_queue']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleBuildingUpgradeFinish,
      getPendingBuildingUpgrade: vi.fn().mockResolvedValue(null)
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player to upgrade building in another player city', async () => {
    await assert.rejects(
      () => finishBuildingUpgrade({
        city_id: city.id,
        player_id: other_player_id,
        building_id: building_to_finish.id,
        level: 0,
        upgraded_at
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should not update when building level does not match the job', async () => {
    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 1,
      upgraded_at
    })

    assert.ok(result === null)
    assert.strictEqual(buildingUpdateOne.mock.calls.length, 0)
  })

  it('should finish the building upgrade', async () => {
    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 0,
      upgraded_at
    })

    const updated_building = buildingUpdateOne.mock.calls[0][0]
    assert.ok(updated_building)
    assert.strictEqual(updated_building.level, 1)
    assert.ok(result)
    assert.strictEqual(result?.code, BuildingCode.MUSHROOM_FARM)
    assert.strictEqual(result?.upgraded_at, upgraded_at)
    assert.deepStrictEqual(emit.mock.calls[0], [
      AppEvent.BuildingUpgradeFinished,
      {
        city_id: city.id,
        player_id
      }
    ])
  })

  it('should start the next queued upgrade when it can start', async () => {
    const queued = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.RECYCLING_PLANT,
      created_at: now()
    })
    queueListByCity
      .mockResolvedValueOnce([queued])
      .mockResolvedValueOnce([])

    await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 0,
      upgraded_at
    })

    const { duration } = PricingService.getBuildingLevelCost({
      level: next_building.level + 1,
      code: next_building.code,
      architecture_level: architecture.level
    })

    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 1)
    const scheduled = scheduleBuildingUpgradeFinish.mock.calls[0][0]
    assert.strictEqual(scheduled.building_id, next_building.id)
    assert.strictEqual(scheduled.execute_at, upgraded_at + duration * 1000)
    assert.strictEqual(queueDelete.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls[0][0], queued.id)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
  })

  it('should drop queued upgrades that cannot start and try the next', async () => {
    const failing = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY,
      created_at: now()
    })
    const succeeding = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.RECYCLING_PLANT,
      created_at: now() + 1
    })

    // Cloning factory needs Architecture >= 2; list returns empty so requirements fail
    repository.technology.list = vi.fn().mockResolvedValue([])

    queueListByCity
      .mockResolvedValueOnce([failing, succeeding])
      .mockResolvedValueOnce([succeeding])
      .mockResolvedValueOnce([])

    await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 0,
      upgraded_at
    })

    assert.deepStrictEqual(queueDelete.mock.calls.map(call => call[0]), [
      failing.id,
      succeeding.id
    ])
    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 1)
    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls[0][0].building_id, next_building.id)
  })
})
