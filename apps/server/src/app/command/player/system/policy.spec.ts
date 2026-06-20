import assert from 'assert'
import {
  actForSystemPlayer,
  categoriesForTick,
  SYSTEM_TICK_CATEGORIES,
  type SystemTickAction,
  type SystemTickCategory
} from './policy'

describe('system player tick policy', () => {
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
        return category === 'recruit'
      },
    ])) as Record<SystemTickCategory, SystemTickAction>

    const acted = await actForSystemPlayer({
      player_id: 'player-id',
      tick_index: 1,
      actions
    })

    assert.strictEqual(acted, 'recruit')
    assert.deepStrictEqual(calls, [
      'research',
      'recruit' 
    ])
  })

  it('returns null when no category can act', async () => {
    const actions = Object.fromEntries(SYSTEM_TICK_CATEGORIES.map(category => [
      category,
      async () => false,
    ])) as Record<SystemTickCategory, SystemTickAction>

    const acted = await actForSystemPlayer({
      player_id: 'player-id',
      tick_index: 0,
      actions
    })

    assert.strictEqual(acted, null)
  })
})
