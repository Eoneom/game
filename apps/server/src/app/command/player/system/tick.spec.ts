import type { MockInstance } from 'vitest'
import { tickSystemPlayers } from './tick'
import { actForSystemPlayer, SYSTEM_MAX_ACTIONS_PER_TICK } from '#command/player/system/policy'
import * as observabilityEmit from '#command/player/system/emit-observability'
import * as statsEmit from '#command/player/system/emit-stats'
import * as statsQuery from '#app/query/admin/system-player-stats'
import * as empireSnapshot from '#app/query/player/system/empire-snapshot'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { PlayerEntity } from '#core/player/entity'
import { FactionCode } from '#core/faction/constant/code'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
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

  const default_snapshot = {
    player_id: player.id,
    temporary_outpost_count: 0,
    permanent_outpost_count: 0,
    expansion_categories: [
      'base',
      'settle',
      'make-permanent',
      'explore',
    ] as const,
    economy_first: false,
    production_ready_for_research: false,
    defer_explore: false,
    expansion_starved: true,
    combat_army_ready: false,
    needs_outpost_logistics: false,
    outpost_transport_pressure_count: 0,
    can_found_city: true,
    settle_ready_temp_count: 0,
    outpost_limit_reached: false,
  }

  let listSystemControlled: MockInstance
  let scheduleSystemPlayerTick: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(empireSnapshot, 'collectSystemEmpireSnapshot').mockResolvedValue(default_snapshot)
    listSystemControlled = vi.fn().mockResolvedValue([ player ])
    scheduleSystemPlayerTick = vi.fn().mockResolvedValue('job-id')
    vi.mocked(actForSystemPlayer).mockResolvedValue({
      outcome: 'success',
      category: 'upgrade',
      payload: { building_code: 'mushroom_farm' },
      committed_actions: [
        {
          category: 'upgrade',
          payload: { building_code: 'mushroom_farm' },
        },
      ],
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
      ongoing_movements: [],
      updated_at: tick_at,
    })
    const stats_emit = vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})

    await tickSystemPlayers({ tick_index: 4 })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0].player_id, player.id)
    assert.strictEqual(emit.mock.calls[0][0].outcome, 'success')
    assert.strictEqual(emit.mock.calls[0][0].committed_actions?.[0]?.category, 'upgrade')
    assert.strictEqual(stats_emit.mock.calls.length, 1)
  })

  it('passes snapshot and multi-action limit to actForSystemPlayer', async () => {
    vi.spyOn(observabilityEmit, 'emitSystemPlayerTickObservability').mockImplementation(() => {})
    vi.spyOn(statsEmit, 'emitSystemPlayerStatsUpdated').mockImplementation(() => {})
    vi.spyOn(statsQuery, 'collectSystemPlayerStatsSnapshot').mockResolvedValue({
      player_id: player.id,
      player_name: player.name,
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      ongoing_movements: [],
      updated_at: tick_at,
    })

    await tickSystemPlayers({ tick_index: 4 })

    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls.length, 1)
    assert.strictEqual(
      vi.mocked(actForSystemPlayer).mock.calls[0][0].max_actions,
      SYSTEM_MAX_ACTIONS_PER_TICK,
    )
    assert.deepStrictEqual(
      vi.mocked(actForSystemPlayer).mock.calls[0][0].snapshot,
      default_snapshot,
    )
  })

  it('emits observability with idle outcome and skipped attempts', async () => {
    const skipped_attempts = [
      {
        category: 'upgrade' as const,
        result: 'skipped' as const,
      },
    ]
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
      ongoing_movements: [],
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
