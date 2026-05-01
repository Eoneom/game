import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishBase } from './base'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { rebaseTroopMovement } from '#app/command/troop/movement/rebase'
import { OutpostError } from '#core/outpost/error'

vi.mock('#app/command/troop/movement/finish/base')
vi.mock('#app/command/troop/movement/rebase')

describe('sagaFinishBase', () => {
  const player_id = 'player_id'
  const movement_id = 'movement_id'
  const arrived_at = 1_000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(finishTroopBaseMovement as MockInstance).mockResolvedValue({ is_outpost_created: true })
    ;(rebaseTroopMovement as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls finishTroopBaseMovement with correct args', async () => {
    await sagaFinishBase({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((finishTroopBaseMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at,
    })
  })

  it('returns the result of finishTroopBaseMovement on success', async () => {
    const expected = { is_outpost_created: true }
    ;(finishTroopBaseMovement as MockInstance).mockResolvedValue(expected)

    const result = await sagaFinishBase({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.deepStrictEqual(result, expected)
    assert.strictEqual((rebaseTroopMovement as MockInstance).mock.calls.length, 0)
  })

  it('calls rebaseTroopMovement when LIMIT_REACHED error is thrown', async () => {
    (finishTroopBaseMovement as MockInstance).mockRejectedValue(new Error(OutpostError.LIMIT_REACHED))

    await sagaFinishBase({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual((rebaseTroopMovement as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((rebaseTroopMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at,
    })
  })

  it('returns { is_outpost_created: false } when LIMIT_REACHED error is thrown', async () => {
    (finishTroopBaseMovement as MockInstance).mockRejectedValue(new Error(OutpostError.LIMIT_REACHED))

    const result = await sagaFinishBase({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.deepStrictEqual(result, { is_outpost_created: false })
  })

  it('rethrows errors that are not LIMIT_REACHED', async () => {
    (finishTroopBaseMovement as MockInstance).mockRejectedValue(new Error('unexpected error'))

    await assert.rejects(() => sagaFinishBase({
      player_id,
      movement_id,
      arrived_at,
    }), /unexpected error/)
    assert.strictEqual((rebaseTroopMovement as MockInstance).mock.calls.length, 0)
  })
})
