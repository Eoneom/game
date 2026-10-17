import assert from 'assert'
import { emitSystemPlayerActionCommitted } from './emit-observability'
import { Factory } from '#adapter/factory'
import { AppEvent } from '#core/events'

describe('emitSystemPlayerActionCommitted', () => {
  it('emits a typed bus event with summary and payload', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)

    emitSystemPlayerActionCommitted({
      player_id: 'p1',
      player_name: 'Alpha',
      tick_index: 2,
      category: 'recruit',
      payload: {
        troop_code: 'scout',
        city_name: 'Core I',
      },
      committed_at: 1_700_000_000_000,
    })

    assert.strictEqual(emit.mock.calls.length, 1)
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.SystemPlayerActionCommitted)
    assert.strictEqual(emit.mock.calls[0][1].player_name, 'Alpha')
    assert.match(emit.mock.calls[0][1].summary, /Recrutement de troupes/)
    assert.deepStrictEqual(emit.mock.calls[0][1].payload, {
      troop_code: 'scout',
      city_name: 'Core I',
    })

    vi.restoreAllMocks()
  })
})
