import type { MockInstance } from 'vitest'
import { tickSystemPlayers } from './tick'
import { actForSystemPlayer } from '#command/player/system/policy'
import * as observabilityEmit from '#command/player/system/emit-observability'
import * as statsEmit from '#command/player/system/emit-stats'
import * as statsQuery from '#app/query/admin/system-player-stats'
import * as productionModule from '#command/player/system/production'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { PlayerEntity } from '#core/player/entity'
import { FactionCode } from '#core/faction/constant/code'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { SYSTEM_TICK_CATEGORIES } from '#core/player/system/tick-category'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { BuildingListQuery } from '#query/building/list'
import { OutpostListQuery } from '#query/outpost/list'
import { CityEntity } from '#core/city/entity'
import { BuildingCode } from '#core/building/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { id } from '#shared/identification'
import * as time from '#shared/time'
import assert from 'assert'

vi.mock('#command/player/system/policy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./policy')>()
  return {
    ...actual,
    actForSystemPlayer: vi.fn(),
  }
})

describe('tickSystemPlayers', () => {
  const player = PlayerEntity.create({
    id: id(),
    name: 'Alpha',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    system_controlled: true
  })
  const tick_at = 1_700_000_000_000

  let listSystemControlled: MockInstance
  let scheduleSystemPlayerTick: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(productionModule, 'isEmpireProductionReadyForResearch').mockResolvedValue(false)
    listSystemControlled = vi.fn().mockResolvedValue([ player ])
    scheduleSystemPlayerTick = vi.fn().mockResolvedValue('job-id')
    const city = CityEntity.create({
      id: id(),
      name: 'Core I',
      player_id: player.id,
      cell_id: id(),
    })
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ city ],
      count_limit: 5,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      production_energy_ratio: 1,
      resource_stock: {
        plastic: 100,
        mushroom: 100,
        plasma: 0,
      },
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
    } as never)
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [
        {
          code: BuildingCode.RECYCLING_PLANT,
          level: 1,
        },
        {
          code: BuildingCode.MUSHROOM_FARM,
          level: 1,
        },
      ],
      upgrade_queue: [],
    } as never)
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.mocked(actForSystemPlayer).mockResolvedValue({
      outcome: 'success',
      category: 'upgrade',
      payload: { building_code: 'mushroom_farm' },
      attempts: [
        {
          category: 'upgrade',
          result: 'success',
        },
      ],
    })

    vi.spyOn(Factory, 'getRepository').mockReturnValue({ player: { listSystemControlled } } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleSystemPlayerTick } as unknown as JobQueue)
    vi.spyOn(Factory, 'getTickLogger').mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never)
    vi.spyOn(time, 'now').mockReturnValue(tick_at)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits observability event after a successful action', async () => {
    const emit = vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: tick_at,
    })
    const stats_emit = vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})

    await tickSystemPlayers({ tick_index: 4 })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0].player_id, player.id)
    assert.strictEqual(emit.mock.calls[0][0].outcome, 'success')
    assert.strictEqual(emit.mock.calls[0][0].category, 'upgrade')
    assert.strictEqual(stats_emit.mock.calls.length, 1)
  })

  it('emits observability with idle outcome and skipped attempts', async () => {
    const skipped_attempts = SYSTEM_TICK_CATEGORIES.map(category => ({
      category,
      result: 'skipped' as const,
    }))
    vi.mocked(actForSystemPlayer).mockResolvedValue({
      outcome: 'idle',
      attempts: skipped_attempts,
    })
    const emit = vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    const stats_emit = vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})

    await tickSystemPlayers({ tick_index: 0 })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0].outcome, 'idle')
    assert.deepStrictEqual(emit.mock.calls[0][0].attempts, skipped_attempts)
    assert.strictEqual(stats_emit.mock.calls.length, 0)
  })

  it('prioritizes research before upgrade when production is ready', async () => {
    vi.spyOn(productionModule, 'isEmpireProductionReadyForResearch').mockResolvedValue(true)
    vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: tick_at,
    })

    await tickSystemPlayers({ tick_index: 0 })

    assert.deepStrictEqual(
      vi.mocked(actForSystemPlayer).mock.calls[0][0].categories,
      [
        'base',
        'settle',
        'make-permanent',
        'explore',
        'research',
        'upgrade',
        'recruit',
        'transport',
        'attack',
      ],
    )
  })

  it('uses commit-first expansion categories while temp outposts exist', async () => {
    const outpost_id = id()
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        {
          id: outpost_id,
          type: OutpostType.TEMPORARY,
        },
      ],
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })
    vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: tick_at,
    })

    await tickSystemPlayers({ tick_index: 0 })

    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].categories?.[0], 'settle')
  })

  it('uses resource-first expansion categories regardless of outpost count', async () => {
    vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: tick_at,
    })
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: Array.from({ length: 8 }, () => ({
        id: id(),
        player_id: player.id,
        cell_id: id(),
        type: 'permanent',
      })),
      cells: [],
      resource_stocks: [],
      count_limit: 10,
    })

    await tickSystemPlayers({ tick_index: 0 })

    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].categories?.[0], 'base')
    assert.strictEqual(
      vi.mocked(actForSystemPlayer).mock.calls[0][0].categories?.[3],
      'explore',
    )
  })

  it('acts for each system-controlled player and reschedules the next tick', async () => {
    vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: tick_at,
    })
    await tickSystemPlayers({ tick_index: 4 })

    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls.length, 1)
    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].player_id, player.id)
    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].tick_index, 4)
    assert.deepStrictEqual(scheduleSystemPlayerTick.mock.calls[0][0], {
      execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
      tick_index: 5
    })
  })

  it('emits error observability and reschedules when a player command fails', async () => {
    vi.mocked(actForSystemPlayer).mockRejectedValue(new Error('command failed'))
    const emit = vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})

    await tickSystemPlayers({ tick_index: 0 })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0].outcome, 'error')
    assert.strictEqual(scheduleSystemPlayerTick.mock.calls.length, 1)
    assert.deepStrictEqual(scheduleSystemPlayerTick.mock.calls[0][0], {
      execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
      tick_index: 1
    })
  })
})
