import type { MockInstance } from 'vitest'
import { BuildingGetQuery } from '#app/query/building/get'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingEntity } from '#core/building/entity'
import { BuildingCode } from '#core/building/constant/code'
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
  let repository: Pick<Repository, 'city' | 'building' | 'technology' | 'cell'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'c',
      player_id
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
        getCityCell: vi.fn().mockResolvedValue(CellEntity.create({
          id: id(),
          coordinates: {
            x: 1,
            y: 1,
            sector: 1
          },
          type: CellType.FOREST,
          resource_coefficient: {
            plastic: 1,
            mushroom: 1,
            plasma: 0
          },
          solar_coefficient: 1
        }))
      } as unknown as Repository['cell']
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
      player_id: other_player_id
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
      current_energy: 15,
      next_energy: 23
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
      current_energy: 20,
      next_energy: 30
    })
  })
})
