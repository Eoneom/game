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
    expansion_categories: [
      'base',
      'settle',
      'make-permanent',
      'explore',
    ],
    economy_first: false,
    production_ready_for_research: false,
    defer_explore: false,
    combat_army_ready: false,
    ...overrides,
  }
}

describe('planSystemPlayerActions', () => {
  it('rotates expansion-first from tick index', () => {
    const plan = planSystemPlayerActions(baseSnapshot(), 1)
    assert.strictEqual(plan[0].category, 'settle')
  })

  it('uses economy-first when snapshot requests it', () => {
    const plan = planSystemPlayerActions(baseSnapshot({ economy_first: true }), 0)
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

  it('uses commit-first expansion ring from snapshot', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      temporary_outpost_count: 2,
      expansion_categories: [
        'settle',
        'make-permanent',
        'base',
        'explore',
      ],
    }), 0)
    assert.strictEqual(plan[0].category, 'settle')
  })
})

describe('categoriesForTick', () => {
  it('completes a full rotation over tick indices', () => {
    assert.deepStrictEqual(categoriesForTick(9), [ ...SYSTEM_TICK_CATEGORIES ])
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
