import { systemTickActions } from './actions'
import { upgradeBuilding } from '#app/command/building/upgrade'
import { citySettle } from '#app/command/city/settle'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { BuildingListQuery } from '#query/building/list'
import { BuildingGetQuery } from '#query/building/get'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { TechnologyListQuery } from '#query/technology/list'
import { TroopListQuery } from '#query/troop/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { BuildingEntity } from '#core/building/entity'
import { id } from '#shared/identification'
import {
  testCityCell, testResourceStock 
} from '../../../test-support/resource-stock'
import assert from 'assert'

vi.mock('#app/command/building/upgrade', () => ({ upgradeBuilding: vi.fn().mockResolvedValue(undefined) }))
vi.mock('#app/command/city/settle', () => ({ citySettle: vi.fn().mockResolvedValue({ city_id: 'new-city' }) }))
vi.mock('#app/command/troop/movement/create', () => ({ createTroopMovement: vi.fn().mockResolvedValue({}) }))

describe('systemTickActions', () => {
  const player_id = id()
  const city_id = id()
  const city_cell = testCityCell({ cell_id: id() })
  const city = CityEntity.create({
    id: city_id,
    name: 'Core I',
    player_id,
    cell_id: city_cell.id
  })

  const fakeLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn()
  }

  beforeEach(() => {
    fakeLogger.child.mockReturnValue(fakeLogger)
    vi.mocked(upgradeBuilding).mockClear()
    vi.mocked(citySettle).mockClear()
    vi.mocked(createTroopMovement).mockClear()
    vi.spyOn(Factory, 'getRepository').mockReturnValue({} as Repository)
    vi.spyOn(Factory, 'getLogger').mockReturnValue(fakeLogger as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('upgrades the first legal building', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({ technologies: [] })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000
      }),
      maximum_building_levels: 100,
      building_levels_used: 1
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 0
        }
      ],
      upgrade_queue: []
    })
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockResolvedValue({
      building: BuildingEntity.create({
        id: id(),
        city_id,
        code: BuildingCode.MUSHROOM_FARM,
        level: 0
      }),
      cost: {
        code: BuildingCode.MUSHROOM_FARM,
        level: 1,
        resource: {
          plastic: 10,
          mushroom: 10,
          plasma: 0
        },
        duration: 1
      },
      requirement: {
        buildings: [],
        technologies: []
      },
      metadata: {}
    })

    const acted = await systemTickActions.upgrade(player_id)

    assert.strictEqual(acted, true)
    assert.strictEqual(vi.mocked(upgradeBuilding).mock.calls.length, 1)
    assert.deepStrictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0], {
      player_id,
      city_id,
      building_code: BuildingCode.MUSHROOM_FARM
    })
  })

  it('skips transport when the permanent outpost has no stock', async () => {
    const outpost_cell = testCityCell({ cell_id: id() })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 0,
        mushroom: 0
      })
    } as never)
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        OutpostEntity.create({
          id: id(),
          player_id,
          cell_id: outpost_cell.id,
          type: OutpostType.PERMANENT
        })
      ],
      cells: [ outpost_cell ],
      resource_stocks: [
        testResourceStock({
          cell_id: outpost_cell.id,
          plastic: 0,
          mushroom: 0,
          plasma: 0
        })
      ],
      count_limit: 10
    })

    const acted = await systemTickActions.transport(player_id)

    assert.strictEqual(acted, false)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('settles the next Core roman name when a temporary outpost has a founder', async () => {
    const outpost_id = id()
    const outpost_cell = testCityCell({ cell_id: id() })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        OutpostEntity.create({
          id: outpost_id,
          player_id,
          cell_id: outpost_cell.id,
          type: OutpostType.TEMPORARY
        })
      ],
      cells: [ outpost_cell ],
      resource_stocks: [
        testResourceStock({
          cell_id: outpost_cell.id,
          plastic: 0,
          mushroom: 0
        })
      ],
      count_limit: 10
    })
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: outpost_cell.id,
          code: TroopCode.ASSEMBLER,
          count: 1,
          movement_id: null
        })
      ],
      costs: {} as never,
      pending_recruitment: null
    })

    const acted = await systemTickActions.settle(player_id)

    assert.strictEqual(acted, true)
    assert.deepStrictEqual(vi.mocked(citySettle).mock.calls[0][0], {
      player_id,
      outpost_id,
      city_name: 'Core II'
    })
  })

  it('does not create a transport movement for explore', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.SEEKER,
          count: 0,
          movement_id: null
        })
      ],
      costs: {} as never,
      pending_recruitment: null
    })

    const acted = await systemTickActions.explore(player_id)

    assert.strictEqual(acted, false)
    const transport_calls = vi.mocked(createTroopMovement).mock.calls.filter(call => call[0].action === MovementAction.TRANSPORT)
    assert.strictEqual(transport_calls.length, 0)
  })
})
