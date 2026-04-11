import type { MockInstance } from 'vitest'
import { cancelBuilding } from '#app/command/building/cancel'
import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { BuildingError } from '#core/building/error'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { now } from '#shared/time'
import assert from 'assert'
import {
  testResourceStock, testCityCell 
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('cancelBuilding', () => {
  const player_id = id()
  const another_player_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let building: BuildingEntity
  let stockUpdateOne: MockInstance
  let buildingUpdateOne: MockInstance
  let repository: Pick<Repository, 'building' | 'city' | 'cell' | 'resource_stock'>

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
      city_id: city.id,
      upgrade_at: now() + 1000 * 60
    })

    buildingUpdateOne = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      building: {
        getInProgress: vi.fn().mockResolvedValue(building),
        updateOne: buildingUpdateOne
      } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
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
    repository.building.getInProgress = vi.fn().mockResolvedValue(null)

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

  it('should cancel building', async () => {
    await cancelBuilding({
      player_id,
      city_id: city.id
    })

    const updated_building = buildingUpdateOne.mock.calls[0][0]
    assert.ok(building.upgrade_at)
    assert.ok(!updated_building.upgrade_at)
  })
})
