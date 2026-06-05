import type { MockInstance } from 'vitest'
import { cancelBuilding } from '#app/command/building/cancel'
import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#adapter/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { BuildingError } from '#core/building/error'
import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import assert from 'assert'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'
import { now } from '#shared/time'

describe('cancelBuilding', () => {
  const player_id = id()
  const another_player_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let building: BuildingEntity
  let architecture: TechnologyEntity
  let stockUpdateOne: MockInstance
  let getPendingBuildingUpgrade: MockInstance
  let cancelBuildingUpgradeFinish: MockInstance
  let scheduleBuildingUpgradeFinish: MockInstance
  let queueListByCity: MockInstance
  let queueDelete: MockInstance
  let repository: Pick<
    Repository,
    'building' | 'city' | 'cell' | 'resource_stock' | 'building_upgrade_queue' | 'technology'
  >

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    city_cell = testCityCell({ city_id: city.id })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM
    })

    building = BuildingEntity.create({
      id: id(),
      code: BuildingCode.MUSHROOM_FARM,
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
    getPendingBuildingUpgrade = vi.fn().mockResolvedValue({
      player_id,
      city_id: city.id,
      building_id: building.id,
      level: 0,
      execute_at: Date.now() + 60_000,
      job_id: 'job'
    })
    cancelBuildingUpgradeFinish = vi.fn().mockResolvedValue(undefined)
    scheduleBuildingUpgradeFinish = vi.fn().mockResolvedValue('job-id')
    queueListByCity = vi.fn().mockResolvedValue([])
    queueDelete = vi.fn().mockResolvedValue(undefined)

    repository = {
      building: {
        getById: vi.fn().mockResolvedValue(building),
        get: vi.fn().mockResolvedValue(building),
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
        list: vi.fn().mockResolvedValue([])
      } as unknown as Repository['technology'],
      building_upgrade_queue: {
        listByCity: queueListByCity,
        delete: queueDelete
      } as unknown as Repository['building_upgrade_queue']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingBuildingUpgrade,
      cancelBuildingUpgradeFinish,
      scheduleBuildingUpgradeFinish
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player from cancelling other player buildings', async () => {
    await assert.rejects(
      () => cancelBuilding({
        player_id: another_player_id,
        city_id: city.id
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should assert that there is a building in progress', async () => {
    getPendingBuildingUpgrade.mockResolvedValue(null)

    await assert.rejects(
      () => cancelBuilding({
        player_id,
        city_id: city.id
      }),
      new RegExp(BuildingError.NOT_IN_PROGRESS)
    )
  })

  it('should refund half of the building price when building is cancelled', async () => {
    await cancelBuilding({
      player_id,
      city_id: city.id
    })

    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, STARTING_PLASTIC + 39)
    assert.strictEqual(updated_stock.mushroom, STARTING_MUSHROOM + 67)
  })

  it('should cancel the scheduled upgrade job', async () => {
    await cancelBuilding({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(cancelBuildingUpgradeFinish.mock.calls.length, 1)
    assert.deepStrictEqual(cancelBuildingUpgradeFinish.mock.calls[0][0], { city_id: city.id })
  })

  it('should start the next queued upgrade after cancelling', async () => {
    const queued = BuildingUpgradeQueueEntity.create({
      id: id(),
      city_id: city.id,
      building_code: BuildingCode.MUSHROOM_FARM,
      created_at: now()
    })
    queueListByCity
      .mockResolvedValueOnce([queued])
      .mockResolvedValueOnce([])

    // After refund, give enough resources for the next start
    const rich_stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: 30000,
      mushroom: 30000
    })
    repository.resource_stock.getByCellId = vi.fn()
      .mockResolvedValueOnce(stock)
      .mockResolvedValue(rich_stock)

    await cancelBuilding({
      player_id,
      city_id: city.id
    })

    assert.strictEqual(scheduleBuildingUpgradeFinish.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls.length, 1)
    assert.strictEqual(queueDelete.mock.calls[0][0], queued.id)
  })
})
