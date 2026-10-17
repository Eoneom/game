import type { Response } from 'express'
import { adminForceSystemPlayerTickPostHandler } from './post'
import * as forceTick from '#command/admin/force-system-player-tick'

describe('adminForceSystemPlayerTickPostHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns tick summary on success', async () => {
    vi.spyOn(forceTick, 'forceSystemPlayerTick').mockResolvedValue({
      tick_index: 3,
      next_tick_index: 4,
      next_execute_at: 1_700_000_060_000,
      system_player_count: 2,
    })

    const json = vi.fn()
    const res = { json } as unknown as Response

    await adminForceSystemPlayerTickPostHandler({} as never, res, vi.fn())

    expect(json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        tick_index: 3,
        next_tick_index: 4,
        next_execute_at: 1_700_000_060_000,
        system_player_count: 2,
      },
    })
  })
})
