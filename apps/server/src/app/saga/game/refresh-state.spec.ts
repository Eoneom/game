import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaRefreshGameState } from './refresh-state'
import { cityGather } from '#app/command/city/gather'
import { sagaFinishMovement } from '#app/saga/finish/movement'

vi.mock('#app/command/city/gather')
vi.mock('#app/saga/finish/movement')

describe('sagaRefreshGameState', () => {
  const player_id = 'player_id'
  const city_id = 'city_id'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(sagaFinishMovement as MockInstance).mockResolvedValue(undefined)
    ;(cityGather as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls sagaFinishMovement with player_id', async () => {
    await sagaRefreshGameState({
      player_id,
      city_id
    })

    assert.strictEqual((sagaFinishMovement as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((sagaFinishMovement as MockInstance).mock.calls[0][0], { player_id })
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

  it('calls commands in order: sagaFinishMovement, cityGather', async () => {
    const order: string[] = []
    ;(sagaFinishMovement as MockInstance).mockImplementation(async () => {
      order.push('finish-movement')
    })
    ;(cityGather as MockInstance).mockImplementation(async () => {
      order.push('city-gather')
    })

    await sagaRefreshGameState({
      player_id,
      city_id
    })

    assert.deepStrictEqual(order, [
      'finish-movement',
      'city-gather'
    ])
  })
})
