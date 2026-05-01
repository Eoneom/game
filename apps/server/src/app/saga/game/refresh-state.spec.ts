import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaRefreshGameState } from './refresh-state'
import { cityGather } from '#app/command/city/gather'

vi.mock('#app/command/city/gather')

describe('sagaRefreshGameState', () => {
  const player_id = 'player_id'
  const city_id = 'city_id'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(cityGather as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls cityGather once with now()', async () => {
    await sagaRefreshGameState({
      player_id,
      city_id
    })

    assert.strictEqual((cityGather as MockInstance).mock.calls.length, 1)
    const call = (cityGather as MockInstance).mock.calls[0][0]
    assert.strictEqual(call.player_id, player_id)
    assert.strictEqual(call.city_id, city_id)
    assert.ok(typeof call.gather_at_time === 'number')
  })
})
