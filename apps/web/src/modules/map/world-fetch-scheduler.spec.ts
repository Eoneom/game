import { createCellCache, mergeCells } from '#map/cell-cache'
import { fetchBoundsAround } from '#map/viewport'
import { CellType } from '@eoneom/api-client'

import {
  NAVIGATION_DEBOUNCE_MS,
  planNavigationFetch,
  planPanEndFetch,
} from './world-fetch-scheduler'

describe('world-fetch-scheduler', () => {
  const center = { x: 50, y: 50 }

  it('requests immediate terrain fetch on cache miss', () => {
    const cache = createCellCache()
    const bounds = fetchBoundsAround(center, 3)
    const plan = planNavigationFetch({
      cache,
      bounds,
      pendingDetail: 'full',
    })
    expect(plan).toEqual({ kind: 'immediate', detail: 'terrain' })
  })

  it('debounces when the viewport is fully cached', () => {
    const cache = createCellCache()
    const bounds = fetchBoundsAround(center, 3)
    const batch = []
    for (let x = bounds.min_x; x <= bounds.max_x; x += 1) {
      for (let y = bounds.min_y; y <= bounds.max_y; y += 1) {
        batch.push({
          coordinates: { x, y },
          type: CellType.FOREST,
          explored: false,
        })
      }
    }
    mergeCells(cache, batch)
    const plan = planNavigationFetch({
      cache,
      bounds,
      pendingDetail: 'full',
    })
    expect(plan).toEqual({ kind: 'debounced', detail: 'full' })
  })

  it('pan end never schedules full viewport intel', () => {
    const cache = createCellCache()
    const bounds = fetchBoundsAround(center, 3)
    const pan = planPanEndFetch({ cache, bounds })
    expect(pan.detail).toBe('terrain')
    expect(pan.shouldFetch).toBe(true)
  })

  it('exports navigation debounce constant', () => {
    expect(NAVIGATION_DEBOUNCE_MS).toBe(90)
  })
})
