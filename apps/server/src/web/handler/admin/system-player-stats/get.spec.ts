import type { Response } from 'express'
import { adminSystemPlayerStatsGetHandler } from './get'
import * as statsQuery from '#app/query/admin/system-player-stats'

describe('adminSystemPlayerStatsGetHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns stats snapshots for all system players', async () => {
    const snapshot = {
      player_id: 'p1',
      player_name: 'Alpha',
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: 1,
    }
    vi.spyOn(statsQuery, 'listSystemPlayerStatsSnapshots').mockResolvedValue([ snapshot ])

    const json = vi.fn()
    const res = { json } as unknown as Response

    await adminSystemPlayerStatsGetHandler({} as never, res, vi.fn())

    expect(json).toHaveBeenCalledWith({
      status: 'ok',
      data: { players: [ snapshot ] },
    })
  })
})
