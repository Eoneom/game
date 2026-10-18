import assert from 'assert'
import {
  categoriesForTick,
  deprioritizeExploreInPlan,
  planSystemPlayerActions,
  prioritizeResearchBeforeUpgrade,
} from './planner'
import { SYSTEM_TICK_CATEGORIES } from './tick-category'
import type { SystemEmpireSnapshot } from './empire-snapshot'

function baseSnapshot(overrides: Partial<SystemEmpireSnapshot> = {}): SystemEmpireSnapshot {
  return {
    player_id: 'player-1',
    temporary_outpost_count: 0,
    permanent_outpost_count: 2,
    expansion_categories: [
      'base',
      'settle',
      'make-permanent',
      'explore',
    ],
    economy_first: false,
    production_ready_for_research: false,
    defer_explore: false,
    expansion_starved: false,
    combat_army_ready: false,
    needs_outpost_logistics: false,
    ...overrides,
  }
}

describe('planSystemPlayerActions', () => {
  it('rotates expansion-first from tick index', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      expansion_starved: false,
      permanent_outpost_count: 2,
    }), 1)
    assert.strictEqual(plan[0].category, 'settle')
  })

  it('uses economy-first when snapshot requests it', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      economy_first: true,
      expansion_starved: false,
    }), 0)
    assert.strictEqual(plan[0].category, 'upgrade')
  })

  it('swaps research before upgrade when production is ready', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      production_ready_for_research: true,
    }), 0)
    const upgrade_index = plan.findIndex(intent => intent.category === 'upgrade')
    const research_index = plan.findIndex(intent => intent.category === 'research')
    assert.ok(research_index < upgrade_index)
  })

  it('moves explore after other expansion intents when deferring', () => {
    const plan = planSystemPlayerActions(baseSnapshot({ defer_explore: true }), 0)
    const explore_index = plan.findIndex(intent => intent.category === 'explore')
    const base_index = plan.findIndex(intent => intent.category === 'base')
    assert.ok(explore_index > base_index)
    assert.strictEqual(plan[explore_index].reason, 'defer_explore_for_basing')
  })

  it('prepends make-permanent when temporary outposts exist', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      temporary_outpost_count: 2,
      expansion_starved: false,
      expansion_categories: [
        'make-permanent',
        'settle',
        'base',
        'explore',
      ],
    }), 0)
    assert.strictEqual(plan[0].category, 'make-permanent')
    assert.strictEqual(plan[0].reason, 'commit_temp_outpost')
    assert.strictEqual(plan[1].category, 'make-permanent')
    assert.strictEqual(plan[1].reason, 'commit_temp_outpost')
    assert.strictEqual(plan[2].category, 'settle')
    assert.ok(plan.every((intent, index) => intent.priority === index))
  })

  it('prepends base intents when expansion-starved and overrides economy-first', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      economy_first: true,
      expansion_starved: true,
    }), 0)
    assert.deepStrictEqual(
      plan.slice(0, 2).map(intent => ({
        category: intent.category,
        reason: intent.reason,
      })),
      [
        {
          category: 'base',
          reason: 'expansion_starved',
        },
        {
          category: 'base',
          reason: 'expansion_starved',
        },
      ],
    )
    assert.strictEqual(plan[2].category, 'settle')
  })

  it('does not prepend base when empire has enough permanent outposts and explore is not deferred', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      permanent_outpost_count: 2,
      expansion_starved: false,
      economy_first: true,
    }), 0)
    assert.strictEqual(plan[0].category, 'upgrade')
    assert.ok(!plan.some(intent => intent.reason === 'expansion_starved'))
  })

  it('prepends one make-permanent per temp outpost up to max actions per tick', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      temporary_outpost_count: 5,
      expansion_starved: false,
      economy_first: true,
    }), 0)
    assert.deepStrictEqual(
      plan.slice(0, 3).map(intent => intent.category),
      [
        'make-permanent',
        'make-permanent',
        'make-permanent',
      ],
    )
    assert.ok(plan.slice(0, 3).every(intent => intent.reason === 'commit_temp_outpost'))
    assert.strictEqual(plan[3].category, 'upgrade')
  })

  it('prepends deploy-outpost intents when outpost logistics are needed', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      needs_outpost_logistics: true,
      expansion_starved: false,
    }), 0)
    assert.strictEqual(plan[0].category, 'deploy-outpost')
    assert.strictEqual(plan[0].reason, 'outpost_logistics')
    assert.strictEqual(plan[1].category, 'deploy-outpost')
    assert.strictEqual(plan[1].reason, 'outpost_logistics')
    assert.strictEqual(plan[2].category, 'base')
  })
})

describe('categoriesForTick', () => {
  it('completes a full rotation over tick indices', () => {
    assert.deepStrictEqual(categoriesForTick(10), [ ...SYSTEM_TICK_CATEGORIES ])
  })
})

describe('prioritizeResearchBeforeUpgrade', () => {
  it('swaps when research follows upgrade', () => {
    assert.deepStrictEqual(
      prioritizeResearchBeforeUpgrade([
        'upgrade',
        'research',
      ]),
      [
        'research',
        'upgrade',
      ],
    )
  })
})

describe('deprioritizeExploreInPlan', () => {
  it('places explore after the expansion block', () => {
    const ordered = deprioritizeExploreInPlan([
      'explore',
      'base',
      'settle',
      'upgrade',
    ])
    assert.deepStrictEqual(ordered.slice(0, 3), [
      'base',
      'settle',
      'explore',
    ])
    assert.strictEqual(ordered[3], 'upgrade')
  })
})
