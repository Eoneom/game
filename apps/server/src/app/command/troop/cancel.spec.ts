import type { MockInstance } from 'vitest'
import { cancelTroop } from '#app/command/troop/cancel'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { CityEntity } from '#core/city/entity'
import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { CityError } from '#core/city/error'
import { now } from '#shared/time'
import assert from 'assert'
import { troop_costs } from '#core/pricing/constant/troop'
import {
  testResourceStock, testCityCell
} from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('cancelTroop', () => {
  const player_id = id()
  const another_player_id = id()
  const code = TroopCode.EXPLORER
  const cell_id = id()
  let city: CityEntity
  let city_cell: ReturnType<typeof testCityCell>
  let stock: ReturnType<typeof testResourceStock>
  let troop: TroopEntity
  let troopUpdateOne: MockInstance
  let stockUpdateOne: MockInstance
  let getPendingTroopRecruitProgress: MockInstance
  let cancelTroopRecruitProgress: MockInstance
  let repository: Pick<Repository, 'cell' | 'city' | 'troop' | 'resource_stock'>
  let pending: {
    player_id: string
    city_id: string
    troop_id: string
    remaining_count: number
    finish_at: number
    started_at: number
    last_progress: number
    execute_at: number
    job_id: string
  }

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
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM
    })

    const current_time = now()
    const last_progress = current_time - troop_costs[code].duration * 1000
    const remaining_count = 1000
    troop = TroopEntity.create({
      id: id(),
      code,
      count: 0,
      cell_id,
      player_id,
      movement_id: null
    })

    pending = {
      player_id,
      city_id: city.id,
      troop_id: troop.id,
      remaining_count,
      finish_at: last_progress + 1000 * remaining_count * troop_costs[code].duration,
      last_progress,
      started_at: last_progress,
      execute_at: current_time,
      job_id: 'job-1'
    }

    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    getPendingTroopRecruitProgress = vi.fn().mockResolvedValue(pending)
    cancelTroopRecruitProgress = vi.fn().mockResolvedValue(undefined)

    repository = {
      cell: { getCityCell: vi.fn().mockResolvedValue(city_cell) } as unknown as Repository['cell'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      troop: {
        getById: vi.fn().mockResolvedValue(troop),
        updateOne: troopUpdateOne,
      } as unknown as Repository['troop'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(stock),
        updateOne: stockUpdateOne,
      } as unknown as Repository['resource_stock'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopRecruitProgress,
      cancelTroopRecruitProgress
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player from cancelling other player troops', async () => {
    await assert.rejects(
      () => cancelTroop({
        city_id: city.id,
        player_id: another_player_id,
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should assert that there is a troop in progress', async () => {
    getPendingTroopRecruitProgress.mockResolvedValue(null)

    await assert.rejects(
      () => cancelTroop({
        city_id: city.id,
        player_id,
      }),
      new RegExp(TroopError.NOT_IN_PROGRESS)
    )
  })

  it('should refund the remaining troop price when troop is cancelled', async () => {
    await cancelTroop({
      city_id: city.id,
      player_id,
    })

    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, STARTING_PLASTIC + 999 * troop_costs[code].plastic)
    assert.strictEqual(updated_stock.mushroom, STARTING_MUSHROOM + 999 * troop_costs[code].mushroom)
  })

  it('should recruit troops since the last progress', async () => {
    await cancelTroop({
      city_id: city.id,
      player_id,
    })

    const updated_troop = troopUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_troop.count, 1)
  })

  it('should cancel troop and job', async () => {
    await cancelTroop({
      city_id: city.id,
      player_id,
    })

    assert.strictEqual(cancelTroopRecruitProgress.mock.calls.length, 1)
    assert.deepStrictEqual(cancelTroopRecruitProgress.mock.calls[0][0], { city_id: city.id })
  })
})
