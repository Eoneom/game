import type { MockInstance } from 'vitest'
import { BuildingGetQuery } from '#app/query/building/get'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingEntity } from '#core/building/entity'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingService } from '#core/building/service'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'

describe('BuildingGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let building: BuildingEntity
  let architecture: TechnologyEntity
  let photovoltaic_optimization: TechnologyEntity
  let repository: Pick<Repository, 'city' | 'building' | 'technology' | 'cell' | 'exchange'>

  beforeEach(() => {
    const city_cell = CellEntity.create({
      id: id(),
      coordinates: {
        x: 1,
        y: 1 },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 0
      },
      solar_coefficient: 1
    })
    city = CityEntity.initCity({
      name: 'c',
      player_id,
      cell_id: city_cell.id
    })
    building = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB,
      level: 1
    })
    architecture = TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.ARCHITECTURE,
      level: 2
    })
    photovoltaic_optimization = TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      level: 0
    })

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      building: { getInCity: vi.fn().mockResolvedValue(building) } as unknown as Repository['building'],
      technology: {
        get: vi.fn().mockImplementation(({ code }: { code: TechnologyCode }) => {
          if (code === TechnologyCode.ARCHITECTURE) {
            return Promise.resolve(architecture)
          }
          if (code === TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION) {
            return Promise.resolve(photovoltaic_optimization)
          }
          return Promise.reject(new Error(`unexpected technology code: ${code}`))
        })
      } as unknown as Repository['technology'],
      cell: {
        getById: vi.fn().mockResolvedValue(city_cell)
      } as unknown as Repository['cell'],
      exchange: { countOpenByCity: vi.fn().mockResolvedValue(1) } as unknown as Repository['exchange'],
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ getPendingBuildingUpgrade: vi.fn().mockResolvedValue(null) } as unknown as import('#app/port/job-queue').JobQueue)
    vi.spyOn(AppService, 'getCityEnergyConsumptionBreakdown').mockResolvedValue({
      energy_consumption: 60,
      non_production_consumption: 60,
      production_consumption: 0,
      production_energy_ratio: 1,
      energy_supply: 200
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when city is not owned by player', async () => {
    const other = CityEntity.initCity({
      name: 'x',
      player_id: other_player_id,
      cell_id: id()
    })
    ;(repository.city.get as MockInstance).mockResolvedValue(other)

    await expect(new BuildingGetQuery().run({
      city_id: other.id,
      building_code: BuildingCode.RESEARCH_LAB,
      player_id
    })).rejects.toThrow(CityError.NOT_OWNER)
  })

  it('returns consumption metadata for research lab building', async () => {
    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.RESEARCH_LAB,
      player_id
    })

    expect(result.building).toBe(building)
    expect(result.metadata).toEqual({
      current_consumption: 60,
      next_consumption: 78,
      energy_upgrade_warning: false
    })
    expect(result.requirement).toBeDefined()
    expect(result.cost).toBeDefined()
    expect(repository.building.getInCity).toHaveBeenCalledWith({
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB
    })
  })

  it('returns movement bonus, player cap and recruitment queue size for the command center', async () => {
    const command_center = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.COMMAND_CENTER,
      level: 2
    })
    ;(repository.building.getInCity as MockInstance).mockResolvedValue(command_center)
    vi.spyOn(AppService, 'getMovementCapacity').mockResolvedValue({
      used: 3,
      limit: 9
    })

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.COMMAND_CENTER,
      player_id
    })

    expect(result.metadata).toEqual({
      current_consumption: 36,
      next_consumption: 43,
      energy_upgrade_warning: false,
      current_movement_bonus: 2,
      next_movement_bonus: 3,
      movement_limit: 9,
      recruit_queue_limit: 3
    })
    expect(result.requirement.technologies).toEqual([
      {
        code: TechnologyCode.ARCHITECTURE,
        level: 2
      }
    ])
  })

  it('returns no recruitment queue for a command center still at level 0', async () => {
    vi.mocked(repository.building.getInCity).mockResolvedValue(BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.COMMAND_CENTER,
      level: 0
    }))
    vi.spyOn(AppService, 'getMovementCapacity').mockResolvedValue({
      used: 0,
      limit: 5
    })

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.COMMAND_CENTER,
      player_id
    })

    expect(result.metadata).toMatchObject({
      current_movement_bonus: 0,
      next_movement_bonus: 1,
      movement_limit: 5,
      recruit_queue_limit: 0
    })
  })

  it('returns sheltered resources at the current and next level for the underground shelter', async () => {
    vi.mocked(repository.building.getInCity).mockResolvedValue(BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.UNDERGROUND_SHELTER,
      level: 1
    }))

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.UNDERGROUND_SHELTER,
      player_id
    })

    expect(result.metadata).toEqual({
      current_sheltered: {
        plastic: 2000,
        mushroom: 1500,
        plasma: 200,
        water: 100
      },
      next_sheltered: {
        plastic: 3200,
        mushroom: 2400,
        plasma: 320,
        water: 160
      }
    })
    expect(result.requirement).toEqual({
      buildings: [],
      technologies: []
    })
  })

  it('returns the open orders and the order limit (its level) for the trading post (slice 035)', async () => {
    vi.mocked(repository.building.getInCity).mockResolvedValue(BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.TRADING_POST,
      level: 2
    }))

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.TRADING_POST,
      player_id
    })

    expect(result.metadata).toEqual({
      open_order_count: 1,
      current_open_order_limit: 2,
      next_open_order_limit: 3
    })
    expect(repository.exchange.countOpenByCity).toHaveBeenCalledWith(city.id)
  })

  it('returns energy upgrade warning when projected consumption exceeds supply', async () => {
    vi.spyOn(AppService, 'getCityEnergyConsumptionBreakdown').mockResolvedValue({
      energy_consumption: 60,
      non_production_consumption: 60,
      production_consumption: 0,
      production_energy_ratio: 1,
      energy_supply: 70
    })

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.RESEARCH_LAB,
      player_id
    })

    expect(result.metadata).toMatchObject({
      energy_upgrade_warning: true
    })
  })

  it('returns energy metadata for solar panel building', async () => {
    const solar_panel = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.SOLAR_PANEL,
      level: 2
    })
    ;(repository.building.getInCity as MockInstance).mockResolvedValue(solar_panel)

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.SOLAR_PANEL,
      player_id
    })

    expect(result.metadata).toEqual({
      current_energy: 120,
      next_energy: 180
    })
  })

  it('returns boosted energy metadata when photovoltaic optimization is researched', async () => {
    photovoltaic_optimization = TechnologyEntity.create({
      id: id(),
      player_id,
      code: TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
      level: 2
    })
    const solar_panel = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.SOLAR_PANEL,
      level: 2
    })
    ;(repository.building.getInCity as MockInstance).mockResolvedValue(solar_panel)

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.SOLAR_PANEL,
      player_id
    })

    expect(result.metadata).toEqual({
      current_energy: 159,
      next_energy: 238
    })
  })

  it('applies storage_compression to warehouse capacity metadata', async () => {
    const warehouse = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.PLASTIC_WAREHOUSE,
      level: 1
    })
    vi.mocked(repository.building.getInCity).mockResolvedValue(warehouse)
    vi.spyOn(AppService, 'getTechnologyLevels').mockResolvedValue({ [TechnologyCode.STORAGE_COMPRESSION]: 3 } as Record<TechnologyCode, number>)

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.PLASTIC_WAREHOUSE,
      player_id
    })

    expect(result.metadata.current_capacity).toBeCloseTo(BuildingService.getWarehouseCapacity({
      code: BuildingCode.PLASTIC_WAREHOUSE,
      level: 1
    }) * 1.3)
    expect(result.metadata.next_capacity).toBeCloseTo(BuildingService.getWarehouseCapacity({
      code: BuildingCode.PLASTIC_WAREHOUSE,
      level: 2
    }) * 1.3)
  })

  it('applies plasma_containment to central inductor production metadata', async () => {
    const inductor = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: 1
    })
    vi.mocked(repository.building.getInCity).mockResolvedValue(inductor)
    vi.spyOn(AppService, 'getProductionTechnologyMultipliers').mockResolvedValue({
      plastic: 1,
      mushroom: 1,
      plasma: 1.5
    })
    vi.spyOn(AppService, 'getProductionFactionMultipliers').mockResolvedValue({
      plastic: 1,
      mushroom: 1,
      plasma: 1,
      water: 1
    })

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.CENTRAL_INDUCTOR,
      player_id
    })

    expect(result.metadata.current_production).toBe(0.15)
  })

  it('applies the faction modifier to mushroom farm production metadata (slice 036)', async () => {
    const farm = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.MUSHROOM_FARM,
      level: 3
    })
    vi.mocked(repository.building.getInCity).mockResolvedValue(farm)
    vi.spyOn(AppService, 'getProductionTechnologyMultipliers').mockResolvedValue({
      plastic: 1,
      mushroom: 1.2,
      plasma: 1,
      water: 1
    })
    vi.spyOn(AppService, 'getProductionFactionMultipliers').mockResolvedValue({
      plastic: 0.9,
      mushroom: 1.1,
      plasma: 1,
      water: 1
    })

    const result = await new BuildingGetQuery().run({
      city_id: city.id,
      building_code: BuildingCode.MUSHROOM_FARM,
      player_id
    })

    const coefficients = {
      plastic: 1,
      mushroom: 1,
      plasma: 0,
      water: 1
    }
    expect(result.metadata.current_production).toBe(BuildingService.getEarningsBySecond({
      code: BuildingCode.MUSHROOM_FARM,
      level: 3,
      coefficients,
      technology_multiplier: 1.2,
      faction_multiplier: 1.1
    }))
    expect(result.metadata.next_production).toBe(BuildingService.getEarningsBySecond({
      code: BuildingCode.MUSHROOM_FARM,
      level: 4,
      coefficients,
      technology_multiplier: 1.2,
      faction_multiplier: 1.1
    }))
  })
})
