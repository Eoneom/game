import type { MockInstance } from 'vitest'
import { signupAuth } from './signup'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { FactionCode } from '#core/faction/constant/code'
import { FactionError } from '#core/faction/error'
import { PlayerError } from '#core/player/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'
import assert from 'assert'
import { testResourceStock } from '../../test-support/resource-stock'

describe('signupAuth', () => {
  const player_name = 'player_name'
  const city_name = 'city_name'
  const faction_code = FactionCode.THE_CONFEDERATION
  const cell_id_1 = id()
  const cell_id_2 = id()
  const cell_id_3 = id()
  const cell_id_4 = id()
  const default_cell_params = {
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0
    },
    solar_coefficient: 1
  }
  const city_first_cell = CellEntity.create({
    ...default_cell_params,
    id: id(),
    coordinates: {
      x: 1,
      y: 1 }
  })

  const cells_around_city = [
    CellEntity.create({
      ...default_cell_params,
      id: cell_id_1,
      coordinates: {
        x: 0,
        y: 1
      }
    }),
    CellEntity.create({
      ...default_cell_params,
      id: cell_id_2,
      coordinates: {
        x: 1,
        y: 0
      }
    }),
    CellEntity.create({
      ...default_cell_params,
      id: cell_id_3,
      coordinates: {
        x: 2,
        y: 1
      }
    }),
    CellEntity.create({
      ...default_cell_params,
      id: cell_id_4,
      coordinates: {
        x: 1,
        y: 2
      }
    })
  ]

  let playerExist: MockInstance
  let cityExist: MockInstance
  let playerCreate: MockInstance
  let cityCreate: MockInstance
  let buildingCreate: MockInstance
  let technologyCreate: MockInstance
  let resourceStockGetByCellId: MockInstance
  let resourceStockUpdateOne: MockInstance
  let troopCreate: MockInstance
  let explorationCreate: MockInstance
  let repository: Pick<Repository, 'player' | 'city' | 'building' | 'technology' | 'resource_stock' | 'troop' | 'exploration'>

  beforeEach(() => {
    playerExist = vi.fn().mockResolvedValue(false)
    cityExist = vi.fn().mockResolvedValue(false)
    playerCreate = vi.fn().mockResolvedValue(undefined)
    cityCreate = vi.fn().mockResolvedValue(undefined)
    buildingCreate = vi.fn().mockResolvedValue(undefined)
    technologyCreate = vi.fn().mockResolvedValue(undefined)
    troopCreate = vi.fn().mockResolvedValue(undefined)
    explorationCreate = vi.fn().mockResolvedValue(undefined)
    resourceStockGetByCellId = vi.fn().mockImplementation(({ cell_id }: { cell_id: string }) => Promise.resolve(testResourceStock({
      cell_id,
      plastic: 123,
      mushroom: 456,
      plasma: 0
    })))
    resourceStockUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      player: {
        exist: playerExist,
        create: playerCreate
      } as unknown as Repository['player'],
      city: {
        exist: cityExist,
        create: cityCreate
      } as unknown as Repository['city'],
      building: { create: buildingCreate } as unknown as Repository['building'],
      technology: { create: technologyCreate } as unknown as Repository['technology'],
      resource_stock: {
        getByCellId: resourceStockGetByCellId,
        updateOne: resourceStockUpdateOne
      } as unknown as Repository['resource_stock'],
      troop: { create: troopCreate } as unknown as Repository['troop'],
      exploration: { create: explorationCreate } as unknown as Repository['exploration']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'selectCityFirstCell').mockResolvedValue(city_first_cell)
    vi.spyOn(AppService, 'getCellsAround').mockResolvedValue(cells_around_city)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent user from signup with an existing name', async () => {
    playerExist.mockResolvedValue(true)

    await assert.rejects(
      () => signupAuth({
        player_name,
        city_name,
        faction_code
      }),
      new RegExp(PlayerError.ALREADY_EXISTS)
    )

    assert.strictEqual(playerCreate.mock.calls.length, 0)
  })

  it('should prevent user from signup with an unknown faction', async () => {
    await assert.rejects(
      () => signupAuth({
        player_name,
        city_name,
        faction_code: 'unknown_faction'
      }),
      new RegExp(FactionError.NOT_FOUND)
    )

    assert.strictEqual(playerCreate.mock.calls.length, 0)
  })

  it('should prevent user from settling a city with an existing name', async () => {
    cityExist.mockResolvedValue(true)

    await assert.rejects(
      () => signupAuth({
        player_name,
        city_name,
        faction_code
      }),
      new RegExp(CityError.ALREADY_EXISTS)
    )

    assert.strictEqual(playerCreate.mock.calls.length, 0)
  })

  it('should pass names to exist checks and load surrounding cells from the first city cell', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    assert.strictEqual(playerExist.mock.calls.length, 1)
    assert.strictEqual(playerExist.mock.calls[0][0], player_name)
    assert.strictEqual(cityExist.mock.calls.length, 1)
    assert.strictEqual(cityExist.mock.calls[0][0], city_name)

    const select_first_cell = AppService.selectCityFirstCell as unknown as MockInstance
    assert.strictEqual(select_first_cell.mock.calls.length, 1)

    const get_cells_around = AppService.getCellsAround as unknown as MockInstance
    assert.strictEqual(get_cells_around.mock.calls.length, 1)
    assert.deepStrictEqual(get_cells_around.mock.calls[0][0], { coordinates: city_first_cell.coordinates })
  })

  it('should return player_id and city_id of the created entities', async () => {
    const result = await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    const created_player = playerCreate.mock.calls[0][0]
    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(result.player_id, created_player.id)
    assert.strictEqual(result.city_id, created_city.id)
  })

  it('should create player and city with the given names and link the city to the player', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    const created_player = playerCreate.mock.calls[0][0]
    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(created_player.name, player_name)
    assert.strictEqual(created_player.faction_code, faction_code)
    assert.strictEqual(created_city.name, city_name)
    assert.strictEqual(created_city.player_id, created_player.id)
    assert.strictEqual(created_city.cell_id, city_first_cell.id)
  })

  it('should init all city buildings', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    assert.strictEqual(buildingCreate.mock.calls.length, Object.keys(BuildingCode).length)
    const created_city = cityCreate.mock.calls[0][0]
    buildingCreate.mock.calls.forEach(([ building ]) => {
      assert.strictEqual(building.city_id, created_city.id)
    })
  })

  it('should init all technologies', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    assert.strictEqual(technologyCreate.mock.calls.length, Object.keys(TechnologyCode).length)
    const created_player = playerCreate.mock.calls[0][0]
    technologyCreate.mock.calls.forEach(([ technology ]) => {
      assert.strictEqual(technology.player_id, created_player.id)
    })
  })

  it('should init all city troops', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    assert.strictEqual(troopCreate.mock.calls.length, Object.keys(TroopCode).length)
    const created_player = playerCreate.mock.calls[0][0]
    troopCreate.mock.calls.forEach(([ troop ]) => {
      assert.strictEqual(troop.count, 0)
      assert.strictEqual(troop.player_id, created_player.id)
      assert.strictEqual(troop.cell_id, city_first_cell.id)
      assert.strictEqual(troop.movement_id, null)
    })
  })

  it('should place the city in the world and apply first-city canonical stock', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(created_city.cell_id, city_first_cell.id)

    assert.strictEqual(resourceStockUpdateOne.mock.calls.length, 1)
    const saved_stock = resourceStockUpdateOne.mock.calls[0][0]
    assert.strictEqual(saved_stock.plastic, STARTING_PLASTIC)
    assert.strictEqual(saved_stock.mushroom, STARTING_MUSHROOM)
  })

  it('should init the exploration cells in the world next to the initial city', async () => {
    await signupAuth({
      player_name,
      city_name,
      faction_code
    })

    assert.strictEqual(explorationCreate.mock.calls.length, 1)
    const exploration = explorationCreate.mock.calls[0][0]
    const created_player = playerCreate.mock.calls[0][0]
    const expected_cell_ids = [
      ...cells_around_city.map(cell => cell.id),
      city_first_cell.id
    ]
    assert.deepStrictEqual(exploration.cell_ids, expected_cell_ids)
    assert.strictEqual(exploration.player_id, created_player.id)
  })
})
