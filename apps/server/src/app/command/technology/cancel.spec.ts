import type { MockInstance } from 'vitest'
import { cancelTechnology } from './cancel'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { CityEntity } from '#core/city/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyEntity } from '#core/technology/entity'
import { TechnologyError } from '#core/technology/error'
import assert from 'assert'
import {
  testCityCell, testResourceStock
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('cancelTechnology', () => {
  const player_id = id()
  const city_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let technology: TechnologyEntity
  let getPendingTechnologyResearch: MockInstance
  let cancelTechnologyResearchFinish: MockInstance
  let stockUpdateOne: MockInstance
  let listByPlayer: MockInstance
  let repository: Pick<
    Repository,
    'technology' | 'city' | 'cell' | 'resource_stock' | 'building' | 'technology_research_queue'
  >

  beforeEach(() => {
    city_cell = testCityCell({ cell_id: id() })
    city = CityEntity.create({
      id: city_id,
      name: 'Lab City',
      player_id,
      cell_id: city_cell.id
    })
    stock = testResourceStock({
      cell_id: city_cell.id,
      plastic: 100,
      mushroom: 100,
      plasma: 0
    })
    technology = TechnologyEntity.create({
      id: id(),
      code: TechnologyCode.ARCHITECTURE,
      player_id,
      level: 0
    })

    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    getPendingTechnologyResearch = vi.fn().mockResolvedValue({
      player_id,
      city_id,
      technology_id: technology.id,
      level: 0,
      execute_at: Date.now() + 60_000,
      job_id: 'job'
    })
    cancelTechnologyResearchFinish = vi.fn().mockResolvedValue(undefined)
    listByPlayer = vi.fn().mockResolvedValue([])

    repository = {
      technology: {
        getById: vi.fn().mockResolvedValue(technology)
      } as unknown as Repository['technology'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: { getById: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne
      } as unknown as Repository['resource_stock'],
      building: {
        get: vi.fn().mockResolvedValue(BuildingEntity.create({
          id: id(),
          city_id,
          code: BuildingCode.RESEARCH_LAB,
          level: 1
        }))
      } as unknown as Repository['building'],
      technology_research_queue: {
        listByPlayer,
        delete: vi.fn().mockResolvedValue(undefined)
      } as unknown as Repository['technology_research_queue']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTechnologyResearch,
      cancelTechnologyResearchFinish,
      scheduleTechnologyResearchFinish: vi.fn().mockResolvedValue('job-id')
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should assert that there is a technology in progress', async () => {
    getPendingTechnologyResearch.mockResolvedValue(null)

    await assert.rejects(
      () => cancelTechnology({ player_id }),
      new RegExp(TechnologyError.NOT_IN_PROGRESS)
    )

    assert.strictEqual(cancelTechnologyResearchFinish.mock.calls.length, 0)
  })

  it('should cancel technology research job and refund resources', async () => {
    await cancelTechnology({ player_id })

    assert.strictEqual(cancelTechnologyResearchFinish.mock.calls.length, 1)
    assert.deepStrictEqual(cancelTechnologyResearchFinish.mock.calls[0][0], { player_id })
    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.ok(updated_stock.plastic > stock.plastic)
    assert.ok(updated_stock.mushroom > stock.mushroom)
  })
})
