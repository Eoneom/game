import type { MockInstance } from 'vitest'
import { upgradeBuilding } from '#app/command/building/upgrade'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BUILDING_UPGRADE_QUEUE_LIMIT } from '#core/building/constant/upgrade-queue'
import { BuildingEntity } from '#core/building/entity'
import { BuildingError } from '#core/building/error'
import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { RequirementError } from '#core/requirement/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import assert from 'assert'
import { id } from '#shared/identification'

describe('upgradeBuilding', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let building: BuildingEntity
  let architecture: TechnologyEntity
  let stockUpdateOne: MockInstance
  let scheduleBuildingUpgradeFinish: MockInstance
  let getPendingBuildingUpgrade: MockInstance
  let queueCreate: MockInstance
  let queueCountByCity: MockInstance
  let repository: Pick<
    Repository,
    'building' | 'city' | 'technology' | 'cell' | 'resource_stock' | 'building_upgrade_queue'
  >

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    city_cell = testCityCell({ city_id: city.id })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: 30000,
      mushroom: 30000,
      plasma: 0
    })
    building = BuildingEntity.create({
      id: id(),
      code: BuildingCode.CLONING_FACTORY,
      level: 0,
      city_id: city.id
    })
    architecture = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 0
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleBuildingUpgradeFinish = vi.fn().mockResolvedValue('job-id')
    getPendingBuildingUpgrade = vi.fn().mockResolvedValue(null)
    queueCreate = vi.fn().mockResolvedValue(id())
    queueCountByCity = vi.fn().mockResolvedValue(0)

    repository = {
      building: {
        get: vi.fn().mockResolvedValue(building),
        getTotalLevels: vi.fn().mockResolvedValue(1),
        list: vi.fn().mockResolvedValue([])
      } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
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
      cell: {
        getCityCellsCount: vi.fn().mockResolvedValue(10),
        getCityCell: vi.fn().mockResolvedValue(city_cell)
      } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock'],
      building_upgrade_queue: {
        create: queueCreate,
        countByCity: queueCountByCity,
        listByCity: vi.fn().mockResolvedValue([])
      } as unknown as Repository['building_upgrade_queue']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingBuildingUpgrade,
      scheduleBuildingUpgradeFinish
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player to upgrade building in another player city', async () => {
    await assert.rejects(
      () => upgradeBuilding({
        player_id: other_player_id,
        city_id: city.id,
        building_code: BuildingCode.CLONING_FACTORY
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should prevent a player to upgrade if city does not have enough resources', async () => {
    const broke = testResourceStock({
      cell_id: city_cell.id,
      plastic: 0,
      mushroom: 0,
      plasma: 0
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(broke)

    await assert.rejects(
      () => upgradeBuilding({
        player_id,
        city_id: city.id,
        building_code: BuildingCode.CLONING_FACTORY
      }),
      new RegExp(CityError.NOT_ENOUGH_RESOURCES)
    )
  })

  it('should enqueue when another building upgrade is in progress', async () => {
    getPendingBuildingUpgrade.mockResolvedValue({
      player_id,
      city_id: city.id,
      building_id: id(),
      level: 0,
      execute_at: Date.now() + 1000,
      job_id: 'job'
    })

    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })

    assert.strictEqual(queueCreate.mock.calls.length, 1)
    const queued = queueCreate.mock.calls[0][0] as BuildingUpgradeQueueEntity
    assert.strictEqual(queued.city_id, city.id)
    assert.strictEqual(queued.building_code, BuildingCode.CLONING_FACTORY)
    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 0)
    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
  })

  it('should reject enqueue when the queue is full', async () => {
    getPendingBuildingUpgrade.mockResolvedValue({
      player_id,
      city_id: city.id,
      building_id: id(),
      level: 0,
      execute_at: Date.now() + 1000,
      job_id: 'job'
    })
    queueCountByCity.mockResolvedValue(BUILDING_UPGRADE_QUEUE_LIMIT)

    await assert.rejects(
      () => upgradeBuilding({
        player_id,
        city_id: city.id,
        building_code: BuildingCode.CLONING_FACTORY
      }),
      new RegExp(BuildingError.QUEUE_FULL)
    )
  })

  it('should prevent a player to upgrade if there is no more space in the city', async () => {
    repository.building.getTotalLevels = vi.fn().mockResolvedValue(10)
    vi.spyOn(AppService, 'getCityMaximumBuildingLevels').mockResolvedValue(10)

    await assert.rejects(
      () => upgradeBuilding({
        player_id,
        city_id: city.id,
        building_code: BuildingCode.CLONING_FACTORY
      }),
      new RegExp(CityError.NOT_ENOUGH_SPACE)
    )
  })

  it('should prevent player to research if technology requirements are not met', async () => {
    repository.technology.list = vi.fn().mockResolvedValue([])

    await assert.rejects(
      () => upgradeBuilding({
        player_id,
        city_id: city.id,
        building_code: BuildingCode.CLONING_FACTORY
      }),
      new RegExp(RequirementError.TECHNOLOGY_NOT_FULFILLED)
    )
  })

  it('should purchase the upgrade', async () => {
    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })

    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.ok(updated_stock.plastic < stock.plastic)
    assert.ok(updated_stock.mushroom < stock.mushroom)
  })

  it('should schedule the building upgrade finish job', async () => {
    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })

    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 1)
    const args = scheduleBuildingUpgradeFinish.mock.calls[0][0]
    assert.strictEqual(args.player_id, player_id)
    assert.strictEqual(args.city_id, city.id)
    assert.strictEqual(args.building_id, building.id)
    assert.strictEqual(args.level, building.level)
    assert.ok(typeof args.execute_at === 'number')
  })

  it('should drain a stuck queue before starting a new upgrade when nothing is in progress', async () => {
    const next_building = BuildingEntity.create({
      id: id(),
      code: BuildingCode.RECYCLING_PLANT,
      level: 0,
      city_id: city.id
    })
    const queued = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.RECYCLING_PLANT,
      created_at: Date.now()
    })

    repository.building.get = vi.fn().mockImplementation(async ({ code }: { code: BuildingCode }) => {
      if (code === BuildingCode.RECYCLING_PLANT) {
        return next_building
      }
      return building
    })
    repository.building_upgrade_queue.listByCity = vi.fn()
      .mockResolvedValueOnce([queued])
      .mockResolvedValueOnce([])
    repository.building_upgrade_queue.delete = vi.fn().mockResolvedValue(undefined)

    getPendingBuildingUpgrade
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        player_id,
        city_id: city.id,
        building_id: next_building.id,
        level: 0,
        execute_at: Date.now() + 1000,
        job_id: 'queued-started'
      })

    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })

    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 1)
    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls[0][0].building_id, next_building.id)
    assert.strictEqual(queueCreate.mock.calls.length, 1)
    assert.strictEqual(
      (queueCreate.mock.calls[0][0] as BuildingUpgradeQueueEntity).building_code,
      BuildingCode.CLONING_FACTORY
    )
  })

  it('should take less time to upgrade with an increase architecture level', async () => {
    repository.technology.get = vi
      .fn()
      .mockResolvedValueOnce(TechnologyEntity.create({
        id: architecture.id,
        code: TechnologyCode.ARCHITECTURE,
        player_id,
        level: 0
      }))
      .mockResolvedValueOnce(TechnologyEntity.create({
        id: architecture.id,
        code: TechnologyCode.ARCHITECTURE,
        player_id,
        level: 10
      }))

    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })
    const without_architecture = scheduleBuildingUpgradeFinish.mock.calls[0][0]

    await upgradeBuilding({
      player_id,
      city_id: city.id,
      building_code: BuildingCode.CLONING_FACTORY
    })
    const with_architecture = scheduleBuildingUpgradeFinish.mock.calls[1][0]

    assert.ok(with_architecture.execute_at < without_architecture.execute_at)
  })
})
