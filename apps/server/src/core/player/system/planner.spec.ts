import assert from 'assert'
import {
  categoriesForTick,
  deprioritizeExploreInPlan,
  planSystemPlayerActions,
  prioritizeResearchBeforeUpgrade,
} from './planner'
import { SYSTEM_TICK_CATEGORIES } from './tick-category'
import {
  defaultSystemEmpireSnapshotFields,
  type SystemEmpireSnapshot,
} from './empire-snapshot'

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
    outpost_transport_pressure_count: 0,
    city_warehouse_under_pressure: false,
    can_found_city: true,
    settle_ready_temp_count: 0,
    ...defaultSystemEmpireSnapshotFields(),
    ...overrides,
  }
}

describe('planSystemPlayerActions', () => {
  it('rotates expansion-first from tick index', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      expansion_starved: false,
      permanent_outpost_count: 2,
      can_found_city: false,
    }), 1)
    const settle_index = plan.findIndex(intent => intent.category === 'settle')
    const explore_index = plan.findIndex(intent => intent.category === 'explore')
    assert.ok(settle_index >= 0)
    assert.ok(explore_index > settle_index)
  })

  it('uses economy-first when snapshot requests it', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      economy_first: true,
      expansion_starved: false,
      can_found_city: false,
    }), 0)
    const upgrade_index = plan.findIndex(intent => intent.category === 'upgrade')
    const explore_index = plan.findIndex(intent => intent.category === 'explore')
    assert.ok(upgrade_index >= 0)
    assert.ok(upgrade_index < explore_index)
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

  it('prepends settle only (no make-permanent) while founder temps await city', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      temporary_outpost_count: 2,
      settle_ready_temp_count: 2,
      expansion_starved: false,
      expansion_categories: [
        'settle',
        'make-permanent',
        'base',
        'explore',
      ],
    }), 0)
    assert.strictEqual(plan[0].category, 'settle')
    assert.strictEqual(plan[0].reason, 'found_city_candidate')
    assert.strictEqual(plan[1].category, 'settle')
    assert.ok(!plan.some(intent => intent.category === 'make-permanent'))
  })

  it('omits base intents when the outpost count limit is reached', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      outpost_limit_reached: true,
      expansion_starved: true,
      defer_explore: true,
      can_found_city: true,
      temporary_outpost_count: 0,
      settle_ready_temp_count: 0,
      economy_first: false,
    }), 0)
    assert.ok(!plan.some(intent => intent.category === 'base'))
    assert.strictEqual(plan[0].category, 'settle')
  })

  it('prepends city-founding base when under cap and no temps', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      can_found_city: true,
      temporary_outpost_count: 0,
      settle_ready_temp_count: 0,
      permanent_outpost_count: 5,
      expansion_starved: false,
      economy_first: true,
    }), 0)
    assert.strictEqual(plan[0].category, 'base')
    assert.strictEqual(plan[0].reason, 'city_founding')
    assert.strictEqual(plan[1].category, 'base')
    assert.ok(plan.some(intent => intent.category === 'upgrade'))
  })

  it('prepends base intents when expansion-starved and overrides economy-first', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      economy_first: true,
      expansion_starved: true,
      can_found_city: false,
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
    assert.ok(plan.some(intent => intent.category === 'settle'))
  })

  it('does not prepend base when empire has enough permanent outposts and explore is not deferred', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      permanent_outpost_count: 2,
      expansion_starved: false,
      economy_first: true,
      can_found_city: false,
    }), 0)
    const upgrade_index = plan.findIndex(intent => intent.category === 'upgrade')
    const base_starved_index = plan.findIndex(intent => intent.reason === 'expansion_starved')
    assert.ok(upgrade_index >= 0)
    assert.ok(base_starved_index === -1 || upgrade_index < base_starved_index)
  })

  it('prepends one make-permanent per temp outpost up to max actions per tick', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      temporary_outpost_count: 5,
      expansion_starved: false,
      economy_first: true,
    }), 0)
    assert.deepStrictEqual(
      plan.slice(0, 5).map(intent => intent.category),
      [
        'make-permanent',
        'make-permanent',
        'make-permanent',
        'make-permanent',
        'make-permanent',
      ],
    )
    assert.ok(plan.slice(0, 5).every(intent => intent.reason === 'commit_temp_outpost'))
    assert.ok(plan.some(intent => intent.category === 'upgrade'))
  })

  it('prepends deploy-outpost intents when outpost logistics are needed', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      needs_outpost_logistics: true,
      expansion_starved: false,
      can_found_city: false,
    }), 0)
    assert.strictEqual(plan[0].category, 'deploy-outpost')
    assert.strictEqual(plan[0].reason, 'outpost_logistics')
    assert.strictEqual(plan[1].category, 'deploy-outpost')
    assert.match(plan[1].reason ?? '', /^outpost_logistics/)
    assert.ok(plan.some(intent => intent.category === 'base'))
  })

  it('prepends upgrade intents when the main city warehouse is under pressure', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      city_warehouse_under_pressure: true,
      expansion_starved: false,
      can_found_city: false,
    }), 0)
    assert.strictEqual(plan[0].category, 'upgrade')
    assert.strictEqual(plan[0].reason, 'city_warehouse_pressure')
    assert.strictEqual(plan[1].category, 'upgrade')
    assert.strictEqual(plan[1].reason, 'city_warehouse_pressure')
  })

  it('prepends transport intents when permanent outpost stock is pressured', () => {
    const plan = planSystemPlayerActions(baseSnapshot({
      outpost_transport_pressure_count: 4,
      expansion_starved: false,
      can_found_city: false,
    }), 0)
    assert.deepStrictEqual(
      plan.slice(0, 4).map(intent => ({
        category: intent.category,
        reason: intent.reason,
      })),
      [
        {
          category: 'transport',
          reason: 'outpost_transport_pressure',
        },
        {
          category: 'transport',
          reason: 'outpost_transport_pressure',
        },
        {
          category: 'transport',
          reason: 'outpost_transport_pressure',
        },
        {
          category: 'transport',
          reason: 'outpost_transport_pressure',
        },
      ],
    )
    assert.ok(!plan.some((intent, index) => index >= 4 && intent.category === 'transport'))
    assert.ok(plan.some(intent => intent.category === 'base'))
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
