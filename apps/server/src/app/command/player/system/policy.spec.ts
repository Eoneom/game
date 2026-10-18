import assert from 'assert'
import {
  actForSystemPlayer,
  categoriesForTick,
  prioritizeResearchBeforeUpgrade,
  systemTickExpansionCategories,
  SYSTEM_TICK_CATEGORIES,
  type SystemTickAction,
  type SystemTickCategory
} from './policy'

describe('system player tick policy', () => {
  it('swaps upgrade and research when research comes after upgrade', () => {
    assert.deepStrictEqual(
      prioritizeResearchBeforeUpgrade([
        'recruit',
        'upgrade',
        'research',
        'explore',
      ]),
      [
        'recruit',
        'research',
        'upgrade',
        'explore',
      ],
    )
  })

  it('leaves order unchanged when research is already before upgrade', () => {
    const categories = categoriesForTick(1, { economy_first: true })
    assert.deepStrictEqual(prioritizeResearchBeforeUpgrade(categories), categories)
  })

  it('rotates a base-first expansion ring from the tick index', () => {
    const base_first = [
      'base',
      'explore',
      'settle',
      'make-permanent',
    ] as const
    assert.strictEqual(categoriesForTick(0, { expansion_categories: base_first })[0], 'base')
    assert.strictEqual(categoriesForTick(1, { expansion_categories: base_first })[0], 'explore')
  })

  it('rotates the resource-first expansion category ring from the tick index', () => {
    assert.strictEqual(categoriesForTick(0)[0], 'base')
    assert.strictEqual(categoriesForTick(1)[0], 'settle')
    assert.strictEqual(categoriesForTick(4)[0], 'upgrade')
    assert.deepStrictEqual(categoriesForTick(10), [ ...SYSTEM_TICK_CATEGORIES ])
  })

  it('large empires still lead expansion ticks with base before explore', () => {
    const expansion = systemTickExpansionCategories({ temporary_outpost_count: 0 })
    assert.strictEqual(expansion[0], 'base')
    assert.strictEqual(expansion[expansion.length - 1], 'explore')
    assert.strictEqual(categoriesForTick(0, { expansion_categories: expansion })[0], 'base')
    assert.strictEqual(categoriesForTick(3, { expansion_categories: expansion })[0], 'explore')
  })

  it('rotates economy-first when the main city needs baseline upkeep', () => {
    assert.strictEqual(categoriesForTick(0, { economy_first: true })[0], 'upgrade')
    assert.strictEqual(categoriesForTick(1, { economy_first: true })[0], 'research')
    assert.strictEqual(categoriesForTick(4, { economy_first: true })[0], 'transport')
  })

  it('walks from the rotated start until one action succeeds', async () => {
    const calls: SystemTickCategory[] = []
    const actions = Object.fromEntries(SYSTEM_TICK_CATEGORIES.map(category => [
      category,
      async () => {
        calls.push(category)
        return category === 'recruit' ? { troop_code: 'scout' } : null
      },
    ])) as Record<SystemTickCategory, SystemTickAction>

    const acted = await actForSystemPlayer({
      player_id: 'player-id',
      tick_index: 1,
      actions,
      categories: categoriesForTick(1, { economy_first: true }),
    })

    assert.strictEqual(acted.outcome, 'success')
    if (acted.outcome === 'success') {
      assert.strictEqual(acted.category, 'recruit')
      assert.deepStrictEqual(acted.payload, { troop_code: 'scout' })
    }
    assert.deepStrictEqual(acted.attempts, [
      {
        category: 'research',
        result: 'skipped',
      },
      {
        category: 'deploy-outpost',
        result: 'skipped',
      },
      {
        category: 'recruit',
        result: 'success',
      },
    ])
    assert.deepStrictEqual(calls, [ 'research', 'deploy-outpost', 'recruit' ])
  })

  it('commits up to max_actions successes in plan order', async () => {
    const calls: SystemTickCategory[] = []
    const actions = Object.fromEntries(SYSTEM_TICK_CATEGORIES.map(category => [
      category,
      async () => {
        calls.push(category)
        if (category === 'upgrade' || category === 'research') {
          return { ok: category }
        }
        return null
      },
    ])) as Record<SystemTickCategory, SystemTickAction>

    const acted = await actForSystemPlayer({
      player_id: 'player-id',
      tick_index: 0,
      actions,
      categories: [
        'upgrade',
        'research',
        'recruit',
        'transport',
      ],
      max_actions: 3,
    })

    assert.strictEqual(acted.outcome, 'partial')
    if (acted.outcome !== 'idle') {
      assert.strictEqual(acted.committed_actions.length, 2)
      assert.deepStrictEqual(
        acted.committed_actions.map(action => action.category),
        [
          'upgrade',
          'research',
        ],
      )
    }
    assert.deepStrictEqual(calls, [
      'upgrade',
      'research',
      'recruit',
      'transport',
    ])
  })

  it('returns idle with skipped attempts when no category can act', async () => {
    const actions = Object.fromEntries(SYSTEM_TICK_CATEGORIES.map(category => [
      category,
      async () => null,
    ])) as Record<SystemTickCategory, SystemTickAction>

    const acted = await actForSystemPlayer({
      player_id: 'player-id',
      tick_index: 0,
      actions
    })

    assert.strictEqual(acted.outcome, 'idle')
    assert.strictEqual(acted.attempts.length, SYSTEM_TICK_CATEGORIES.length)
    assert.ok(acted.attempts.every(attempt => attempt.result === 'skipped'))
  })
})
