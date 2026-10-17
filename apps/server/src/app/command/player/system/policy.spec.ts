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
    const categories = categoriesForTick(1)
    assert.deepStrictEqual(prioritizeResearchBeforeUpgrade(categories), categories)
  })

  it('rotates the category ring from the tick index', () => {
    assert.strictEqual(categoriesForTick(0)[0], 'upgrade')
    assert.strictEqual(categoriesForTick(1)[0], 'research')
    assert.strictEqual(categoriesForTick(3)[0], 'explore')
    assert.deepStrictEqual(categoriesForTick(8), [ ...SYSTEM_TICK_CATEGORIES ])
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
      actions
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
    assert.deepStrictEqual(calls, [
      'research',
      'recruit' 
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
