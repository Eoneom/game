import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishSpy } from './spy'
import { finishTroopSpyMovement } from '#app/command/troop/movement/finish/spy'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { now } from '#shared/time'

vi.mock('#app/command/troop/movement/finish/spy')
vi.mock('#app/command/troop/movement/finish/base')

describe('sagaFinishSpy', () => {
  const player_id = 'player_id'
  const movement_id = 'movement_id'
  const arrived_at = 1_000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(finishTroopBaseMovement as MockInstance).mockResolvedValue({ is_outpost_created: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finishes the return trip at once when it already arrived', async () => {
    const base_arrive_at = now() - 1_000
    ;(finishTroopSpyMovement as MockInstance).mockResolvedValue({
      outcome: 'success',
      base_movement: { id: 'base-id' },
      base_arrive_at,
    })

    await sagaFinishSpy({
      player_id,
      movement_id,
      arrived_at 
    })

    assert.deepStrictEqual((finishTroopSpyMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at 
    })
    assert.deepStrictEqual((finishTroopBaseMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id: 'base-id',
      arrived_at: base_arrive_at,
    })
  })

  it('leaves a future return trip to its scheduled job', async () => {
    (finishTroopSpyMovement as MockInstance).mockResolvedValue({
      outcome: 'aborted',
      base_movement: { id: 'base-id' },
      base_arrive_at: now() + 60_000,
    })

    await sagaFinishSpy({
      player_id,
      movement_id,
      arrived_at 
    })

    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 0)
  })

  it('has nothing to bring home after a failure', async () => {
    (finishTroopSpyMovement as MockInstance).mockResolvedValue({ outcome: 'failure' })

    await sagaFinishSpy({
      player_id,
      movement_id,
      arrived_at 
    })

    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 0)
  })
})
