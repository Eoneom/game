import type { MockInstance } from 'vitest'
import { recruitTroop } from '#app/command/troop/recruit'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { RequirementError } from '#core/requirement/error'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import assert from 'assert'
import {
  testResourceStock, testCityCell 
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('recruitTroop', () => {
  const player_id = id()
  const other_player_id = id()
  const requested_troop_count = 10
  const cell_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let troop: TroopEntity
  let troopUpdateOne: MockInstance
  let stockUpdateOne: MockInstance
  let repository: Pick<Repository, 'cell' | 'city' | 'building' | 'technology' | 'troop' | 'resource_stock'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id,
    })
    city_cell = testCityCell({
      city_id: city.id,
      cell_id 
    })
    stock = testResourceStock({
      cell_id,
      plastic: 100000,
      mushroom: 100000
    })
    troop = TroopEntity.init({
      player_id,
      cell_id,
      code: TroopCode.EXPLORER,
    })

    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      building: { getLevel: vi.fn().mockResolvedValue(0) } as unknown as Repository['building'],
      technology: { getLevel: vi.fn().mockResolvedValue(0) } as unknown as Repository['technology'],
      troop: {
        getInCell: vi.fn().mockResolvedValue(troop),
        isInProgress: vi.fn().mockResolvedValue(false),
        updateOne: troopUpdateOne,
      } as unknown as Repository['troop'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne,
      } as unknown as Repository['resource_stock'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
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
      mushroom: 0 
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
    repository.troop.isInProgress = vi.fn().mockResolvedValue(true)

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

  it('should launch troops recruitment', async () => {
    await recruitTroop({
      city_id: city.id,
      player_id,
      troop_code: TroopCode.EXPLORER,
      count: requested_troop_count,
    })

    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.ok(updated_troop.ongoing_recruitment)
    assert.ok(updated_troop.ongoing_recruitment.finish_at)
    assert.ok(updated_troop.ongoing_recruitment.last_progress)
    assert.strictEqual(updated_troop.ongoing_recruitment.remaining_count, requested_troop_count)
  })
})
