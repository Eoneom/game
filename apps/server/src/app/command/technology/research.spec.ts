import type { MockInstance } from 'vitest'
import { researchTechnology } from './research'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { RequirementError } from '#core/requirement/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { TechnologyError } from '#core/technology/error'
import assert from 'assert'
import {
  testResourceStock, testCityCell 
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('researchTechnology', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let technology: TechnologyEntity
  let research_lab: BuildingEntity
  let stockUpdateOne: MockInstance
  let technologyUpdateOne: MockInstance
  let repository: Pick<Repository, 'city' | 'technology' | 'building' | 'cell' | 'resource_stock'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    city_cell = testCityCell({ city_id: city.id })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: 100000,
      mushroom: 100000
    })
    technology = TechnologyEntity.init({
      player_id,
      code: TechnologyCode.ARCHITECTURE
    })
    research_lab = BuildingEntity.create({
      id: id(),
      city_id: city.id,
      code: BuildingCode.RESEARCH_LAB,
      level: 0
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    technologyUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      technology: {
        get: vi.fn().mockResolvedValue(technology),
        isInProgress: vi.fn().mockResolvedValue(false),
        updateOne: technologyUpdateOne
      } as unknown as Repository['technology'],
      building: { get: vi.fn().mockResolvedValue(research_lab) } as unknown as Repository['building'],
      cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getTechnologyRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.RESEARCH_LAB]: 1 },
      technology: {}
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player to research technology in another player city', async () => {
    await assert.rejects(
      () => researchTechnology({
        city_id: city.id,
        player_id: other_player_id,
        technology_code: TechnologyCode.ARCHITECTURE
      }),
      new RegExp(CityError.NOT_OWNER)
    )

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should prevent a player to research if city does not have enough resources', async () => {
    const broke = testResourceStock({
      cell_id: city_cell.id,
      plastic: 0,
      mushroom: 0
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(broke)

    await assert.rejects(
      () => researchTechnology({
        city_id: city.id,
        player_id,
        technology_code: TechnologyCode.ARCHITECTURE
      }),
      new RegExp(CityError.NOT_ENOUGH_RESOURCES)
    )

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should prevent a player to research if another technology is in progress', async () => {
    repository.technology.isInProgress = vi.fn().mockResolvedValue(true)

    await assert.rejects(
      () => researchTechnology({
        city_id: city.id,
        player_id,
        technology_code: TechnologyCode.ARCHITECTURE
      }),
      new RegExp(TechnologyError.ALREADY_IN_PROGRESS)
    )

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should prevent player to research if building requirements are not met', async () => {
    vi.spyOn(AppService, 'getTechnologyRequirementLevels').mockResolvedValue({
      building: {},
      technology: {}
    })

    await assert.rejects(
      () => researchTechnology({
        city_id: city.id,
        player_id,
        technology_code: TechnologyCode.ARCHITECTURE
      }),
      new RegExp(RequirementError.BUILDING_NOT_FULFILLED)
    )

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should reject when research lab meets base requirement but not base plus technology level', async () => {
    const technology_at_level_2 = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 2,
      research_started_at: undefined
    })
    repository.technology.get = vi.fn().mockResolvedValue(technology_at_level_2)
    vi.spyOn(AppService, 'getTechnologyRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.RESEARCH_LAB]: 2 },
      technology: {}
    })

    await assert.rejects(
      () => researchTechnology({
        city_id: city.id,
        player_id,
        technology_code: TechnologyCode.ARCHITECTURE
      }),
      new RegExp(RequirementError.BUILDING_NOT_FULFILLED)
    )

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 0)
  })

  it('should allow research when research lab meets base plus technology level', async () => {
    const technology_at_level_2 = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 2,
      research_started_at: undefined
    })
    repository.technology.get = vi.fn().mockResolvedValue(technology_at_level_2)
    vi.spyOn(AppService, 'getTechnologyRequirementLevels').mockResolvedValue({
      building: { [BuildingCode.RESEARCH_LAB]: 3 },
      technology: {}
    })

    await researchTechnology({
      city_id: city.id,
      player_id,
      technology_code: TechnologyCode.ARCHITECTURE
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    assert.strictEqual(technologyUpdateOne.mock.calls.length, 1)
  })

  it('should purchase the research', async () => {
    await researchTechnology({
      city_id: city.id,
      player_id,
      technology_code: TechnologyCode.ARCHITECTURE
    })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.ok(updated_stock.plastic < stock.plastic)
    assert.ok(updated_stock.mushroom < stock.mushroom)
  })

  it('should launch the technology research', async () => {
    await researchTechnology({
      city_id: city.id,
      player_id,
      technology_code: TechnologyCode.ARCHITECTURE
    })

    assert.strictEqual(technologyUpdateOne.mock.calls.length, 1)
    const updated_technology = technologyUpdateOne.mock.calls[0][0]
    assert.ok(!technology.research_at)
    assert.ok(updated_technology.research_at)
    assert.ok(updated_technology.research_started_at)
    assert.ok(updated_technology.research_at > updated_technology.research_started_at)
  })
})
