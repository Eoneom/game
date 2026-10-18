import assert from 'assert'
import { emitSystemPlayerTickObservability } from './emit-observability'
import { Factory } from '#adapter/factory'
import { AppEvent } from '#core/events'

describe('emitSystemPlayerTickObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits committed_actions on multi-action partial ticks', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)

    emitSystemPlayerTickObservability({
      player_id: 'p1',
      player_name: 'Alpha',
      tick_index: 2,
      committed_at: 1_700_000_000_000,
      outcome: 'partial',
      attempts: [
        {
          category: 'upgrade',
          result: 'success',
        },
        {
          category: 'research',
          result: 'success',
        },
      ],
      committed_actions: [
        {
          category: 'upgrade',
          payload: { building_code: 'mushroom_farm' },
        },
        {
          category: 'research',
          payload: { technology_code: 'architecture' },
        },
      ],
    })

    assert.strictEqual(emit.mock.calls[0][1].outcome, 'partial')
    assert.strictEqual(emit.mock.calls[0][1].committed_actions?.length, 2)
    assert.match(emit.mock.calls[0][1].summary, /2 actions/)
    assert.strictEqual(emit.mock.calls[0][1].payload, undefined)
  })

  it('emits a typed bus event with summary, attempts, and committed_actions on success', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)

    emitSystemPlayerTickObservability({
      player_id: 'p1',
      player_name: 'Alpha',
      tick_index: 2,
      committed_at: 1_700_000_000_000,
      outcome: 'success',
      attempts: [
        {
          category: 'research',
          result: 'skipped',
        },
        {
          category: 'recruit',
          result: 'success',
        },
      ],
      committed_actions: [
        {
          category: 'recruit',
          payload: {
            troop_code: 'scout',
            city_name: 'Core I',
          },
        },
      ],
    })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.SystemPlayerActionCommitted)
    assert.strictEqual(emit.mock.calls[0][1].outcome, 'success')
    assert.strictEqual(emit.mock.calls[0][1].player_name, 'Alpha')
    assert.match(emit.mock.calls[0][1].summary, /Recrutement de troupes/)
    assert.deepStrictEqual(emit.mock.calls[0][1].attempts, [
      {
        category: 'research',
        result: 'skipped',
      },
      {
        category: 'recruit',
        result: 'success',
      },
    ])
    assert.deepStrictEqual(emit.mock.calls[0][1].committed_actions, [
      {
        category: 'recruit',
        payload: {
          troop_code: 'scout',
          city_name: 'Core I',
        },
      },
    ])
    assert.strictEqual(emit.mock.calls[0][1].payload, undefined)
  })

  it('emits idle outcome with attempt trace and concise summary', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)

    emitSystemPlayerTickObservability({
      player_id: 'p1',
      player_name: 'Alpha',
      tick_index: 0,
      committed_at: 1_700_000_000_000,
      outcome: 'idle',
      attempts: [
        {
          category: 'upgrade',
          result: 'skipped',
        },
      ],
    })

    assert.strictEqual(emit.mock.calls[0][1].outcome, 'idle')
    assert.match(emit.mock.calls[0][1].summary, /Aucune action réussie/)
    assert.strictEqual(emit.mock.calls[0][1].payload, undefined)
    assert.strictEqual(emit.mock.calls[0][1].committed_actions, undefined)
  })

  it('emits safe error payload without stack', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)

    emitSystemPlayerTickObservability({
      player_id: 'p1',
      player_name: 'Alpha',
      tick_index: 1,
      committed_at: 1_700_000_000_000,
      outcome: 'error',
      attempts: [],
      error: new Error('city:not-enough-resources'),
    })

    assert.strictEqual(emit.mock.calls[0][1].outcome, 'error')
    assert.match(emit.mock.calls[0][1].summary, /Erreur/)
    assert.deepStrictEqual(emit.mock.calls[0][1].payload, {
      error_code: 'city:not-enough-resources',
      error_message: 'city:not-enough-resources',
    })
  })
})
