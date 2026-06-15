import type { MockInstance } from 'vitest'
import { citySettle } from './settle'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { CellEntity } from '#core/world/cell/entity'
import { ExplorationEntity } from '#core/world/exploration/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'
import assert from 'assert'

describe('citySettle', () => {
  const player_id = id()
  const other_player_id = id()
  const cell_id = id()
  const city_name = 'city_name'
  const outpost_id = id()
  const troop_id = id()
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

  let exploration: ExplorationEntity
  let settler_troop: TroopEntity
  let outpost: OutpostEntity
  let cell: CellEntity
  let cells_around_city: CellEntity[]

  let outpostDelete: MockInstance
  let cityCreate: MockInstance
  let buildingCreate: MockInstance
  let troopUpdateOne: MockInstance
  let explorationUpdateOne: MockInstance
  let repository: Pick<Repository, 'outpost' | 'city' | 'exploration' | 'cell' | 'troop' | 'building'>

  beforeEach(() => {
    outpost = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY
    })

    settler_troop = TroopEntity.create({
      id: troop_id,
      code: TroopCode.SETTLER,
      count: 1,
      player_id,
      cell_id,
      movement_id: null
    })

    cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 2,
        y: 3
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 0
      },
      solar_coefficient: 1
    })

    exploration = ExplorationEntity.init({
      player_id,
      cell_ids: []
    })

    cells_around_city = [
      CellEntity.create({
        ...default_cell_params,
        id: cell_id_1,
        coordinates: {
          x: 1,
          y: 3
        }
      }),
      CellEntity.create({
        ...default_cell_params,
        id: cell_id_2,
        coordinates: {
          x: 3,
          y: 3
        }
      }),
      CellEntity.create({
        ...default_cell_params,
        id: cell_id_3,
        coordinates: {
          x: 2,
          y: 2
        }
      }),
      CellEntity.create({
        ...default_cell_params,
        id: cell_id_4,
        coordinates: {
          x: 2,
          y: 4
        }
      })
    ]

    outpostDelete = vi.fn().mockResolvedValue(undefined)
    cityCreate = vi.fn().mockResolvedValue(undefined)
    buildingCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    explorationUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      outpost: {
        getById: vi.fn().mockResolvedValue(outpost),
        delete: outpostDelete
      } as unknown as Repository['outpost'],
      city: {
        count: vi.fn().mockResolvedValue(0),
        exist: vi.fn().mockResolvedValue(false),
        create: cityCreate
      } as unknown as Repository['city'],
      exploration: {
        get: vi.fn().mockResolvedValue(exploration),
        updateOne: explorationUpdateOne
      } as unknown as Repository['exploration'],
      cell: {
        getById: vi.fn().mockResolvedValue(cell)
      } as unknown as Repository['cell'],
      troop: {
        listInCell: vi.fn().mockResolvedValue([ settler_troop ]),
        updateOne: troopUpdateOne
      } as unknown as Repository['troop'],
      building: { create: buildingCreate } as unknown as Repository['building']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getCellsAround').mockResolvedValue(cells_around_city)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player from settling a city if limit is reached', async () => {
    repository.city.count = vi.fn().mockResolvedValue(10000)

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(CityError.LIMIT_REACHED)
    )
  })

  it('should prevent player from settling a city on another player outpost', async () => {
    repository.outpost.getById = vi.fn().mockResolvedValue(OutpostEntity.create({
      ...outpost,
      player_id: other_player_id
    }))

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(OutpostError.NOT_OWNER)
    )
  })

  it('should prevent player from settling a city from permanent outpost', async () => {
    repository.outpost.getById = vi.fn().mockResolvedValue(OutpostEntity.create({
      ...outpost,
      type: OutpostType.PERMANENT
    }))

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(CityError.CANNOT_SETTLE_ON_PERMANENT_OUTPOST)
    )
  })

  it('should prevent player from settling a city when there is no settler available', async () => {
    repository.troop.listInCell = vi.fn().mockResolvedValue([
      TroopEntity.create({
        ...settler_troop,
        count: 0
      })
    ])

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(CityError.NO_SETTLER_AVAILABLE)
    )
  })

  it('should prevent player from settling a city with an existing name', async () => {
    repository.city.exist = vi.fn().mockResolvedValue(true)

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(CityError.ALREADY_EXISTS)
    )
  })

  it('should create a city with given name', async () => {
    const { city_id } = await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    assert.strictEqual(cityCreate.mock.calls.length, 1)
    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(created_city.name, city_name)
    assert.strictEqual(created_city.cell_id, cell.id)
    assert.strictEqual(city_id, created_city.id)
  })

  it('should place the city in the world', async () => {
    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(created_city.cell_id, cell.id)
  })

  it('should create buildings for this city', async () => {
    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    assert.strictEqual(buildingCreate.mock.calls.length, Object.keys(BuildingCode).length)
    const created_city = cityCreate.mock.calls[0][0]
    buildingCreate.mock.calls.forEach(([ building ]) => {
      assert.strictEqual(building.city_id, created_city.id)
    })
  })

  it('should init the exploration cells in the world next to the initial city', async () => {
    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    assert.strictEqual(explorationUpdateOne.mock.calls.length, 1)
    const updated_exploration = explorationUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_exploration.cell_ids.length, 5)
  })

  it('should provide the outpost to delete', async () => {
    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    assert.strictEqual(outpostDelete.mock.calls.length, 1)
    assert.strictEqual(outpostDelete.mock.calls[0][0], outpost.id)
  })

  it('should remove one settler from the original outpost troops', async () => {
    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    assert.strictEqual(troopUpdateOne.mock.calls.length, 1)
    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_troop.id, settler_troop.id)
    assert.strictEqual(updated_troop.count, 0)
  })

  it('should prevent settling when no founder troop is on the cell', async () => {
    repository.troop.listInCell = vi.fn().mockResolvedValue([])

    await assert.rejects(
      () => citySettle({
        outpost_id,
        player_id,
        city_name
      }),
      new RegExp(CityError.NO_SETTLER_AVAILABLE)
    )
  })

  it('should consume an assembler as the founder troop', async () => {
    const assembler_troop = TroopEntity.create({
      ...settler_troop,
      code: TroopCode.ASSEMBLER
    })
    repository.troop.listInCell = vi.fn().mockResolvedValue([ assembler_troop ])

    await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_troop.code, TroopCode.ASSEMBLER)
    assert.strictEqual(updated_troop.count, 0)
  })
})
