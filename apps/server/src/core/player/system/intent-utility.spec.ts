import assert from 'assert'
import {
  defaultSystemEmpireSnapshotFields,
  type SystemEmpireSnapshot,
} from './empire-snapshot'
import {
  rerankIntentsByUtility,
  rollForwardSystemEmpireSnapshot,
  scoreSystemIntentUtility,
} from './intent-utility'

function snapshot(overrides: Partial<SystemEmpireSnapshot> = {}): SystemEmpireSnapshot {
  return {
    player_id: 'p1',
    temporary_outpost_count: 0,
    permanent_outpost_count: 1,
    expansion_categories: [
      'base',
      'settle',
      'make-permanent',
      'explore',
    ],
    economy_first: false,
    production_ready_for_research: false,
    defer_explore: false,
    expansion_starved: true,
    combat_army_ready: false,
    needs_outpost_logistics: false,
    outpost_transport_pressure_count: 0,
    city_warehouse_under_pressure: false,
    can_found_city: true,
    settle_ready_temp_count: 0,
    ...defaultSystemEmpireSnapshotFields(),
    ...overrides,
  }
}

describe('intent utility', () => {
  it('roll-forward base increments temporary outpost count', () => {
    const next = rollForwardSystemEmpireSnapshot(snapshot(), 'base')
    assert.strictEqual(next.temporary_outpost_count, 1)
    assert.strictEqual(next.expansion_starved, false)
  })

  it('scores explore lower when frontier queue is non-empty', () => {
    const with_frontier = snapshot({ frontier_queue_length: 2 })
    const explore_score = scoreSystemIntentUtility({ category: 'explore' }, with_frontier)
    const base_score = scoreSystemIntentUtility({ category: 'base' }, with_frontier)
    assert.ok(base_score > explore_score)
  })

  it('reranks flexible intents without moving structural prepends', () => {
    const ranked = rerankIntentsByUtility([
      {
        category: 'base',
        priority: 0,
        reason: 'expansion_starved',
      },
      {
        category: 'explore',
        priority: 1,
      },
      {
        category: 'recruit',
        priority: 2,
      },
    ], snapshot({ expansion_starved: true }))
    assert.strictEqual(ranked[0].category, 'base')
    assert.ok(ranked.findIndex(intent => intent.category === 'recruit')
      < ranked.findIndex(intent => intent.category === 'explore'))
  })
})
