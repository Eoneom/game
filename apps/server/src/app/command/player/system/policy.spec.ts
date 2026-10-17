import assert from 'assert'
import {
  actForSystemPlayer,
  categoriesForTick,
  prioritizeResearchBeforeUpgrade,
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

  it('rotates the expansion-first category ring from the tick index', () => {
    assert.strictEqual(categoriesForTick(0)[0], 'explore')
    assert.strictEqual(categoriesForTick(1)[0], 'base')
    assert.strictEqual(categoriesForTick(4)[0], 'upgrade')
    assert.deepStrictEqual(categoriesForTick(9), [ ...SYSTEM_TICK_CATEGORIES ])
  })

  it('rotates economy-first when the main city needs baseline upkeep', () => {
    assert.strictEqual(categoriesForTick(0, { economy_first: true })[0], 'upgrade')
    assert.strictEqual(categoriesForTick(1, { economy_first: true })[0], 'research')
    assert.strictEqual(categoriesForTick(4, { economy_first: true })[0], 'attack')
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
        category: 'recruit',
        result: 'success',
      },
    ])
    assert.deepStrictEqual(calls, [ 'research', 'recruit' ])
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
