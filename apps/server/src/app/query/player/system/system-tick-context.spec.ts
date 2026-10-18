import { describe, expect, it, vi } from 'vitest'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { FactionCode } from '#core/faction/constant/code'
import {
  createSystemTickContext,
  viewportAround,
  viewportCacheKey,
} from '#app/query/player/system/system-tick-context'

describe('SystemTickContext', () => {
  const player_id = 'player-1'
  const mock_viewport = {
    cells: [],
    explored_cell_ids: [],
    viewer_faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    settlements: {
      cities: [],
      outposts: [],
    },
  }

  it('reuses cache for the same viewport bounds', async () => {
    const run = vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue(mock_viewport)
    const context = createSystemTickContext(player_id)
    const origin = { x: 10, y: 10 }

    await context.getViewportForOrigin(origin)
    await context.getViewportForOrigin(origin)
    await context.getViewportForOrigin({ x: 11, y: 10 })

    expect(run).toHaveBeenCalledTimes(2)
    expect(context.getWorldGetCellsQueryCount()).toBe(2)
    run.mockRestore()
  })

  it('viewportCacheKey matches viewportAround', () => {
    const bounds = viewportAround({ x: 50, y: 50 })
    expect(viewportCacheKey(bounds)).toBe(`${bounds.min_x},${bounds.min_y},${bounds.max_x},${bounds.max_y}`)
  })
})
