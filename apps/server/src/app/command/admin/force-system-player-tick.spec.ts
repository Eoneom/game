import type { MockInstance } from 'vitest'
import { forceSystemPlayerTick } from './force-system-player-tick'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { PlayerEntity } from '#core/player/entity'
import { FactionCode } from '#core/faction/constant/code'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import { id } from '#shared/identification'
import * as tickModule from '#command/player/system/tick'
import * as time from '#shared/time'
import assert from 'assert'

describe('forceSystemPlayerTick', () => {
  const player = PlayerEntity.create({
    id: id(),
    name: 'Alpha',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    system_controlled: true,
  })
  const tick_at = 1_700_000_000_000

  let getPendingSystemPlayerTick: MockInstance
  let listSystemControlled: MockInstance
  let tickSystemPlayers: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    getPendingSystemPlayerTick = vi
      .fn()
      .mockResolvedValueOnce({
        tick_index: 7,
        execute_at: tick_at + 30_000,
        job_id: 'pending-job',
      })
      .mockResolvedValueOnce({
        tick_index: 8,
        execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
        job_id: 'next-job',
      })
    listSystemControlled = vi.fn().mockResolvedValue([ player ])
    tickSystemPlayers = vi.spyOn(tickModule, 'tickSystemPlayers').mockResolvedValue()

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingSystemPlayerTick,
    } as unknown as JobQueue)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: { listSystemControlled },
    } as unknown as Repository)
    vi.spyOn(time, 'now').mockReturnValue(tick_at)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs tickSystemPlayers for the pending tick_index and returns schedule summary', async () => {
    const result = await forceSystemPlayerTick()

    assert.strictEqual(tickSystemPlayers.mock.calls.length, 1)
    assert.deepStrictEqual(tickSystemPlayers.mock.calls[0][0], { tick_index: 7 })
    assert.deepStrictEqual(result, {
      tick_index: 7,
      system_player_count: 1,
      next_tick_index: 8,
      next_execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
    })
  })

  it('uses tick_index 0 when no job is pending', async () => {
    getPendingSystemPlayerTick.mockReset()
    getPendingSystemPlayerTick
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        tick_index: 1,
        execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
        job_id: 'next-job',
      })

    const result = await forceSystemPlayerTick()

    assert.deepStrictEqual(tickSystemPlayers.mock.calls[0][0], { tick_index: 0 })
    assert.strictEqual(result.tick_index, 0)
    assert.strictEqual(result.system_player_count, 1)
  })
})
