import { systemTickActions } from './actions'
import * as combatPolicy from './combat-policy'
import { upgradeBuilding } from '#app/command/building/upgrade'
import { researchTechnology } from '#app/command/technology/research'
import { citySettle } from '#app/command/city/settle'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { AppService } from '#app/service'
import { recruitTroop } from '#app/command/troop/recruit'
import { BuildingListQuery } from '#query/building/list'
import { BuildingGetQuery } from '#query/building/get'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { TechnologyListQuery } from '#query/technology/list'
import { TechnologyGetQuery } from '#query/technology/get'
import { TroopListQuery } from '#query/troop/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { FactionCode } from '#core/faction/constant/code'
import { SYSTEM_TARGET_WAR_MACHINE } from './troops'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { BuildingEntity } from '#core/building/entity'
import { id } from '#shared/identification'
import {
  testCityCell, testResourceStock 
} from '../../../test-support/resource-stock'
import assert from 'assert'

vi.mock('#app/command/building/upgrade', () => ({ upgradeBuilding: vi.fn().mockResolvedValue(undefined) }))
vi.mock('#app/command/technology/research', () => ({ researchTechnology: vi.fn().mockResolvedValue(undefined) }))
vi.mock('#app/command/city/settle', () => ({ citySettle: vi.fn().mockResolvedValue({ city_id: 'new-city' }) }))
vi.mock('#app/command/troop/movement/create', () => ({ createTroopMovement: vi.fn().mockResolvedValue({}) }))
vi.mock('#app/command/troop/recruit', () => ({ recruitTroop: vi.fn().mockResolvedValue(undefined) }))

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
    vi.mocked(researchTechnology).mockClear()
    vi.mocked(citySettle).mockClear()
    vi.mocked(createTroopMovement).mockClear()
    vi.mocked(recruitTroop).mockClear()
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
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [],
      research_queue: []
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000
      }),
      warehouses_capacity: {
        plastic: 50000,
        mushroom: 50000
      },
      warehouse_space_remaining: {
        plastic: 40000,
        mushroom: 40000
      },
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

    assert.ok(acted)
    assert.strictEqual(vi.mocked(upgradeBuilding).mock.calls.length, 1)
    assert.deepStrictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0], {
      player_id,
      city_id,
      building_code: BuildingCode.MUSHROOM_FARM
    })
  })

  it('skips solar panel upgrade when city energy surplus exceeds the max ratio', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [],
      research_queue: [],
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000,
      }),
      warehouses_capacity: {
        plastic: 50000,
        mushroom: 50000,
      },
      warehouse_space_remaining: {
        plastic: 40000,
        mushroom: 40000,
      },
      maximum_building_levels: 100,
      building_levels_used: 5,
      production_energy_ratio: 1,
      energy: 250,
      energy_consumption: 100,
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.SOLAR_PANEL,
          level: 1,
        },
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 1,
        },
        {
          id: id(),
          code: BuildingCode.RECYCLING_PLANT,
          level: 1,
        },
      ],
      upgrade_queue: [],
    })
    const building_cost = {
      resource: {
        plastic: 10,
        mushroom: 10,
        plasma: 0,
      },
      duration: 1,
    }
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockImplementation(async ({ building_code }) => ({
      building: BuildingEntity.create({
        id: id(),
        city_id,
        code: building_code,
        level: 1,
      }),
      cost: {
        code: building_code,
        level: 2,
        ...building_cost,
      },
      requirement: {
        buildings: [],
        technologies: [],
      },
      metadata: {},
    }))

    const acted = await systemTickActions.upgrade(player_id)

    assert.ok(acted)
    assert.notStrictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0].building_code, BuildingCode.SOLAR_PANEL)
  })

  it('prefers a plastic warehouse upgrade when city plastic storage is pressured', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [],
      research_queue: []
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 3500,
        mushroom: 100
      }),
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
      warehouse_space_remaining: {
        plastic: 500,
        mushroom: 2900
      },
      maximum_building_levels: 100,
      building_levels_used: 1
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 1
        },
        {
          id: id(),
          code: BuildingCode.RECYCLING_PLANT,
          level: 1
        },
        {
          id: id(),
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        }
      ],
      upgrade_queue: []
    })
    const building_cost = {
      resource: {
        plastic: 10,
        mushroom: 10,
        plasma: 0
      },
      duration: 1
    }
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockImplementation(async ({ building_code }) => ({
      building: BuildingEntity.create({
        id: id(),
        city_id,
        code: building_code,
        level: 0
      }),
      cost: {
        code: building_code,
        level: 1,
        ...building_cost,
      },
      requirement: {
        buildings: [],
        technologies: []
      },
      metadata: {}
    }))

    const acted = await systemTickActions.upgrade(player_id)

    assert.ok(acted)
    assert.strictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0].building_code, BuildingCode.PLASTIC_WAREHOUSE)
  })

  it('skips building upgrades that fail RequirementService checks', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [
        {
          id: id(),
          code: TechnologyCode.ARCHITECTURE,
          level: 0,
        },
      ],
      research_queue: []
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000
      }),
      warehouses_capacity: {
        plastic: 50000,
        mushroom: 50000
      },
      warehouse_space_remaining: {
        plastic: 40000,
        mushroom: 40000
      },
      maximum_building_levels: 100,
      building_levels_used: 5,
      production_energy_ratio: 1,
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.CLONING_FACTORY,
          level: 0,
        },
        {
          id: id(),
          code: BuildingCode.MUSHROOM_FARM,
          level: 0,
        },
      ],
      upgrade_queue: []
    })
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockImplementation(async ({ building_code }) => ({
      building: BuildingEntity.create({
        id: id(),
        city_id,
        code: building_code,
        level: 0
      }),
      cost: {
        code: building_code,
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
    }))

    const acted = await systemTickActions.upgrade(player_id)

    assert.ok(acted)
    assert.strictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0].building_code, BuildingCode.MUSHROOM_FARM)
  })

  it('skips research when the research lab level is too low', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [
        {
          id: id(),
          code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
          level: 0,
        },
        {
          id: id(),
          code: TechnologyCode.ARCHITECTURE,
          level: 5,
        },
      ],
      research_queue: []
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000
      }),
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.RESEARCH_LAB,
          level: 3,
        },
      ],
      upgrade_queue: []
    })
    vi.spyOn(TechnologyGetQuery.prototype, 'run').mockImplementation(async ({ technology_code }) => ({
      technology: {
        id: id(),
        code: technology_code,
        level: 0,
      },
      cost: {
        code: technology_code,
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
    }))

    const acted = await systemTickActions.research(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(vi.mocked(researchTechnology).mock.calls.length, 0)
  })

  it('does not queue a building upgrade already in progress or queued', async () => {
    const farm_id = id()
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [],
      research_queue: []
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 3500,
        mushroom: 100
      }),
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
      warehouse_space_remaining: {
        plastic: 500,
        mushroom: 2900
      },
      maximum_building_levels: 100,
      building_levels_used: 5,
      production_energy_ratio: 1,
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: farm_id,
          code: BuildingCode.MUSHROOM_FARM,
          level: 1,
          upgrade_at: 99_000,
          upgrade_started_at: 98_000,
        },
        {
          id: id(),
          code: BuildingCode.RECYCLING_PLANT,
          level: 1
        },
        {
          id: id(),
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      upgrade_queue: [
        {
          id: id(),
          building_code: BuildingCode.PLASTIC_WAREHOUSE,
        },
      ],
    })
    const building_cost = {
      resource: {
        plastic: 10,
        mushroom: 10,
        plasma: 0
      },
      duration: 1
    }
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockImplementation(async ({ building_code }) => ({
      building: BuildingEntity.create({
        id: id(),
        city_id,
        code: building_code,
        level: building_code === BuildingCode.MUSHROOM_FARM ? 1 : 0
      }),
      cost: {
        code: building_code,
        level: 1,
        ...building_cost,
      },
      requirement: {
        buildings: [],
        technologies: []
      },
      metadata: {}
    }))

    const acted = await systemTickActions.upgrade(player_id)

    assert.ok(acted)
    assert.strictEqual(vi.mocked(upgradeBuilding).mock.calls[0][0].building_code, BuildingCode.RECYCLING_PLANT)
  })

  it('skips transport when the permanent outpost stock is below warehouse pressure', async () => {
    const outpost_cell = testCityCell({ cell_id: id() })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 1000,
      mushroom: 1000,
    })
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
      }),
      warehouse_space_remaining: {
        plastic: 0,
        mushroom: 0
      }
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
          plastic: 100,
          mushroom: 0,
          plasma: 0
        })
      ],
      count_limit: 10
    })

    const acted = await systemTickActions.transport(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('recruits carriers before scouts when the city scout cap is reached and there are no outposts', async () => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({ technologies: [] })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 10000,
        mushroom: 10000,
      }),
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.CLONING_FACTORY,
          level: 5,
        },
      ],
      upgrade_queue: [],
    })
    const seeker = TroopEntity.create({
      id: id(),
      player_id,
      cell_id: city_cell.id,
      code: TroopCode.SEEKER,
      count: 2,
      movement_id: null,
    })
    const hauler = TroopEntity.create({
      id: id(),
      player_id,
      cell_id: city_cell.id,
      code: TroopCode.HAULER,
      count: 0,
      movement_id: null,
    })
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [ seeker, hauler ],
      costs: {
        [TroopCode.SEEKER]: {
          resource: {
            plastic: 1,
            mushroom: 0,
            plasma: 0,
          },
          duration: 1,
        },
        [TroopCode.HAULER]: {
          resource: {
            plastic: 1,
            mushroom: 0,
            plasma: 0,
          },
          duration: 1,
        },
      } as never,
      pending_recruitment: null,
    })

    const acted = await systemTickActions.recruit(player_id)

    assert.ok(acted)
    assert.deepStrictEqual(vi.mocked(recruitTroop).mock.calls[0][0].troop_code, TroopCode.HAULER)
  })

  it('recruits multiple harvesters in one batch when a permanent outpost needs one', async () => {
    const outpost_id = id()
    const outpost_cell = testCityCell({ cell_id: id() })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({ technologies: [] })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        OutpostEntity.create({
          id: outpost_id,
          player_id,
          cell_id: outpost_cell.id,
          type: OutpostType.PERMANENT,
        }),
      ],
      cells: [ outpost_cell ],
      resource_stocks: [
        testResourceStock({
          cell_id: outpost_cell.id,
          plastic: 0,
          mushroom: 50,
        }),
      ],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 500,
        mushroom: 0,
      }),
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          id: id(),
          code: BuildingCode.CLONING_FACTORY,
          level: 5,
        },
      ],
      upgrade_queue: [],
    })
    vi.spyOn(TroopListQuery.prototype, 'run').mockImplementation(async request => {
      if (request.location?.type === 'outpost') {
        return {
          troops: [],
          costs: {} as never,
          pending_recruitment: null,
        }
      }
      return {
        troops: [
          TroopEntity.create({
            id: id(),
            player_id,
            cell_id: city_cell.id,
            code: TroopCode.HARVESTER,
            count: 0,
            movement_id: null,
          }),
        ],
        costs: {
          [TroopCode.HARVESTER]: {
            resource: {
              plastic: 100,
              mushroom: 0,
              plasma: 0,
            },
            duration: 1,
          },
        } as never,
        pending_recruitment: null,
      }
    })

    const acted = await systemTickActions.recruit(player_id)

    assert.ok(acted)
    assert.strictEqual(vi.mocked(recruitTroop).mock.calls.length, 1)
    assert.strictEqual(vi.mocked(recruitTroop).mock.calls[0][0].count, 5)
    assert.strictEqual(acted?.total_count, 5)
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

    assert.ok(acted)
    assert.deepStrictEqual(vi.mocked(citySettle).mock.calls[0][0], {
      player_id,
      outpost_id,
      city_name: 'Core II'
    })
  })

  it('explores the highest-value unexplored cell in the viewport', async () => {
    const weak_cell = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 1,
        y: city_cell.coordinates.y,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 1,
    })
    const strong_cell = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x,
        y: city_cell.coordinates.y + 1,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1.8,
        mushroom: 1.8,
        plasma: 1,
      },
      solar_coefficient: 2,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.SEEKER,
          count: 1,
          movement_id: null,
        }),
      ],
      costs: {} as never,
      pending_recruitment: null,
    })
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell, weak_cell, strong_cell ],
      explored_cell_ids: [ city_cell.id ],
    })

    const acted = await systemTickActions.explore(player_id)

    assert.ok(acted)
    assert.deepStrictEqual(acted?.destination, strong_cell.coordinates)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls[0][0].action, MovementAction.EXPLORE)
  })

  it('skips explore when a strong explored base site beats marginal fog with many outposts', async () => {
    const base_site = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 1,
        y: city_cell.coordinates.y,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 2.5,
    })
    const far_unexplored = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 5,
        y: city_cell.coordinates.y + 5,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 1,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        { id: id(), type: OutpostType.TEMPORARY },
        { id: id(), type: OutpostType.TEMPORARY },
      ],
      cells: [ city_cell, city_cell ],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.SEEKER,
          count: 1,
          movement_id: null,
        }),
      ],
      costs: {} as never,
      pending_recruitment: null,
    })
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell, base_site, far_unexplored ],
      explored_cell_ids: [ city_cell.id, base_site.id ],
    })

    const acted = await systemTickActions.explore(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('skips explore when a founder can base on a strong explored cell', async () => {
    const base_site = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 1,
        y: city_cell.coordinates.y,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 2.5,
    })
    const far_unexplored = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 5,
        y: city_cell.coordinates.y + 5,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 1,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.SEEKER,
          count: 1,
          movement_id: null,
        }),
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.ASSEMBLER,
          count: 1,
          movement_id: null,
        }),
      ],
      costs: {} as never,
      pending_recruitment: null,
    })
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell, base_site, far_unexplored ],
      explored_cell_ids: [ city_cell.id, base_site.id ],
    })

    const acted = await systemTickActions.explore(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('skips explore for a large empire when a strong resource cell is already scouted', async () => {
    const resource_site = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 1,
        y: city_cell.coordinates.y,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 2.5,
        mushroom: 2.5,
        plasma: 1,
      },
      solar_coefficient: 1,
    })
    const far_unexplored = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 5,
        y: city_cell.coordinates.y + 5,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 1,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 1,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: Array.from({ length: 6 }, (_, index) => ({
        id: id(),
        player_id,
        cell_id: id(),
        type: OutpostType.PERMANENT,
        name: `Outpost ${index}`,
      })),
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.SEEKER,
          count: 1,
          movement_id: null,
        }),
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.ASSEMBLER,
          count: 1,
          movement_id: null,
        }),
      ],
      costs: {} as never,
      pending_recruitment: null,
    })
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell, resource_site, far_unexplored ],
      explored_cell_ids: [ city_cell.id, resource_site.id ],
    })

    const acted = await systemTickActions.explore(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('bases on the highest-scoring explored cell in the viewport', async () => {
    const weak_site = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x + 1,
        y: city_cell.coordinates.y,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 1.2,
    })
    const strong_site = CellEntity.create({
      id: id(),
      coordinates: {
        x: city_cell.coordinates.x,
        y: city_cell.coordinates.y + 1,
      },
      type: CellType.LAKE,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
      },
      solar_coefficient: 2.4,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
    } as never)
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [
        TroopEntity.create({
          id: id(),
          player_id,
          cell_id: city_cell.id,
          code: TroopCode.ASSEMBLER,
          count: 1,
          movement_id: null,
        }),
      ],
      costs: {} as never,
      pending_recruitment: null,
    })
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell, weak_site, strong_site ],
      explored_cell_ids: [ city_cell.id, weak_site.id, strong_site.id ],
    })

    const acted = await systemTickActions.base(player_id)

    assert.ok(acted)
    assert.deepStrictEqual(acted?.destination, strong_site.coordinates)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls[0][0].action, MovementAction.BASE)
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
    vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue({
      cells: [ city_cell ],
      explored_cell_ids: [ city_cell.id ],
    })

    const acted = await systemTickActions.explore(player_id)

    assert.strictEqual(acted, null)
    const transport_calls = vi.mocked(createTroopMovement).mock.calls.filter(call => call[0].action === MovementAction.TRANSPORT)
    assert.strictEqual(transport_calls.length, 0)
  })

  it('limits transport cargo to destination warehouse free space', async () => {
    const outpost_cell = testCityCell({ cell_id: id() })
    const outpost_id = id()
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 1000,
      mushroom: 1000,
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      city,
      cell: city_cell,
      resource_stock: testResourceStock({
        cell_id: city_cell.id,
        plastic: 3900,
        mushroom: 0
      }),
      warehouse_space_remaining: {
        plastic: 100,
        mushroom: 3000
      }
    } as never)
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        OutpostEntity.create({
          id: outpost_id,
          player_id,
          cell_id: outpost_cell.id,
          type: OutpostType.PERMANENT
        })
      ],
      cells: [ outpost_cell ],
      resource_stocks: [
        testResourceStock({
          cell_id: outpost_cell.id,
          plastic: 800,
          mushroom: 200,
          plasma: 0
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
          code: TroopCode.HAULER,
          count: 5,
          movement_id: null
        })
      ],
      costs: {} as never,
      pending_recruitment: null
    })

    const acted = await systemTickActions.transport(player_id)

    assert.ok(acted)
    assert.deepStrictEqual(vi.mocked(createTroopMovement).mock.calls[0][0].resources, {
      plastic: 100,
      mushroom: 200,
      plasma: 0
    })
    assert.deepStrictEqual(vi.mocked(createTroopMovement).mock.calls[0][0].move_troops, [
      {
        code: TroopCode.HAULER,
        count: 1,
      },
    ])
  })

  it('skips attack when the empire combat army is not ready', async () => {
    vi.spyOn(combatPolicy, 'loadEmpireCombatArmyCounts').mockResolvedValue({
      war_machine: 3,
      disruptor: 0,
      legionnaire: 0,
      interceptor: 0,
      total_combat: 3,
    })
    const pick = vi.spyOn(combatPolicy, 'pickSystemAttack')

    const acted = await systemTickActions.attack(player_id)

    assert.strictEqual(acted, null)
    assert.strictEqual(pick.mock.calls.length, 0)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 0)
  })

  it('creates an attack movement when the army is ready and a target is chosen', async () => {
    const destination = {
      x: city_cell.coordinates.x + 1,
      y: city_cell.coordinates.y,
    }
    vi.spyOn(combatPolicy, 'loadEmpireCombatArmyCounts').mockResolvedValue({
      war_machine: SYSTEM_TARGET_WAR_MACHINE,
      disruptor: 13,
      legionnaire: 5,
      interceptor: 5,
      total_combat: SYSTEM_TARGET_WAR_MACHINE + 13 + 5 + 5,
    })
    vi.spyOn(combatPolicy, 'pickSystemAttack').mockResolvedValue({
      origin: city_cell.coordinates,
      destination,
      score: 500,
      move_troops: [
        {
          code: TroopCode.WAR_MACHINE,
          count: SYSTEM_TARGET_WAR_MACHINE,
        },
      ],
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue({
          faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        }),
      },
    } as Repository)

    const acted = await systemTickActions.attack(player_id)

    assert.ok(acted)
    assert.strictEqual(vi.mocked(createTroopMovement).mock.calls.length, 1)
    assert.deepStrictEqual(vi.mocked(createTroopMovement).mock.calls[0][0], {
      player_id,
      action: MovementAction.ATTACK,
      origin: city_cell.coordinates,
      destination,
      move_troops: [
        {
          code: TroopCode.WAR_MACHINE,
          count: SYSTEM_TARGET_WAR_MACHINE,
        },
      ],
      combat_strategy: CombatStrategy.OPENING_STRIKE,
    })
  })
})
