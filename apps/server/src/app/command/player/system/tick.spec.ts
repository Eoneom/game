import type { MockInstance } from 'vitest'
import { tickSystemPlayers } from './tick'
import { actForSystemPlayer } from '#command/player/system/policy'
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

  let listSystemControlled: MockInstance
  let scheduleSystemPlayerTick: MockInstance

  beforeEach(() => {
    listSystemControlled = vi.fn().mockResolvedValue([ player ])
    scheduleSystemPlayerTick = vi.fn().mockResolvedValue('job-id')
    vi.mocked(actForSystemPlayer).mockResolvedValue('upgrade')

    vi.spyOn(Factory, 'getRepository').mockReturnValue({ player: { listSystemControlled } } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleSystemPlayerTick } as unknown as JobQueue)
    vi.spyOn(Factory, 'getLogger').mockReturnValue({
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

  it('acts for each system-controlled player and reschedules the next tick', async () => {
    await tickSystemPlayers({ tick_index: 4 })

    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls.length, 1)
    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].player_id, player.id)
    assert.strictEqual(vi.mocked(actForSystemPlayer).mock.calls[0][0].tick_index, 4)
    assert.deepStrictEqual(scheduleSystemPlayerTick.mock.calls[0][0], {
      execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
      tick_index: 5
    })
  })

  it('reschedules when a player command fails', async () => {
    vi.mocked(actForSystemPlayer).mockRejectedValue(new Error('command failed'))

    await tickSystemPlayers({ tick_index: 0 })

    assert.strictEqual(scheduleSystemPlayerTick.mock.calls.length, 1)
    assert.deepStrictEqual(scheduleSystemPlayerTick.mock.calls[0][0], {
      execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
      tick_index: 1
    })
  })
})
