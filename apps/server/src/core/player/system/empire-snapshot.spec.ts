import assert from 'assert'
import { isExpansionStarved } from './empire-snapshot'

describe('isExpansionStarved', () => {
  it('is true with no temps and few permanent outposts', () => {
    assert.strictEqual(isExpansionStarved({
      temporary_outpost_count: 0,
      permanent_outpost_count: 1,
      defer_explore: false,
    }), true)
  })

  it('is false when permanent outpost target is met', () => {
    assert.strictEqual(isExpansionStarved({
      temporary_outpost_count: 0,
      permanent_outpost_count: 2,
      defer_explore: false,
    }), false)
  })

  it('is true when explore is deferred for basing even with many outposts', () => {
    assert.strictEqual(isExpansionStarved({
      temporary_outpost_count: 0,
      permanent_outpost_count: 5,
      defer_explore: true,
    }), true)
  })

  it('is false while temporary outposts still need commits', () => {
    assert.strictEqual(isExpansionStarved({
      temporary_outpost_count: 1,
      permanent_outpost_count: 0,
      defer_explore: false,
    }), false)
  })
})
