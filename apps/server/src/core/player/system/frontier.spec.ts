import assert from 'assert'
import {
  frontierQueueSummary,
  shouldDeferExploreForFrontier,
  sortFrontierQueue,
} from './frontier'

describe('frontier queue', () => {
  it('defers explore when queue has committable cells', () => {
    assert.strictEqual(shouldDeferExploreForFrontier([
      {
        kind: 'base',
        cell_id: 'c1',
        coordinates: {
          x: 2,
          y: 2,
        },
        score: 10,
      },
    ]), true)
    assert.strictEqual(shouldDeferExploreForFrontier([]), false)
  })

  it('sorts by score then coordinates', () => {
    const sorted = sortFrontierQueue([
      {
        kind: 'base',
        cell_id: 'a',
        coordinates: {
          x: 3,
          y: 1,
        },
        score: 5,
      },
      {
        kind: 'settle',
        cell_id: 'b',
        coordinates: {
          x: 1,
          y: 1,
        },
        score: 8,
      },
    ])
    assert.strictEqual(sorted[0].cell_id, 'b')
    assert.strictEqual(frontierQueueSummary(sorted).top_score, 8)
  })
})
