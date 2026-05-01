import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishExplore } from './explore'
import { finishTroopExploreMovement } from '#app/command/troop/movement/finish/explore'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { now } from '#shared/time'

vi.mock('#app/command/troop/movement/finish/explore')
vi.mock('#app/command/troop/movement/finish/base')

describe('sagaFinishExplore', () => {
  const player_id = 'player_id'
  const movement_id = 'movement_id'
  const base_movement_id = 'base_movement_id'
  const arrived_at = 1_000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(finishTroopBaseMovement as MockInstance).mockResolvedValue({ is_outpost_created: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls finishTroopExploreMovement with correct args', async () => {
    (finishTroopExploreMovement as MockInstance).mockResolvedValue({
      base_movement: { id: base_movement_id },
      base_arrive_at: now() + 10_000,
    })

    await sagaFinishExplore({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual((finishTroopExploreMovement as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((finishTroopExploreMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at,
    })
  })

  it('calls finishTroopBaseMovement with base_movement.id when base movement has arrived', async () => {
    const base_arrive_at = now() - 1_000
    ;(finishTroopExploreMovement as MockInstance).mockResolvedValue({
      base_movement: { id: base_movement_id },
      base_arrive_at,
    })

    await sagaFinishExplore({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((finishTroopBaseMovement as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id: base_movement_id,
      arrived_at: base_arrive_at,
    })
  })

  it('does not call finishTroopBaseMovement when base movement has not arrived', async () => {
    (finishTroopExploreMovement as MockInstance).mockResolvedValue({
      base_movement: { id: base_movement_id },
      base_arrive_at: now() + 10_000,
    })

    await sagaFinishExplore({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 0)
  })

  it('propagates errors from finishTroopExploreMovement', async () => {
    (finishTroopExploreMovement as MockInstance).mockRejectedValue(new Error('explore error'))

    await assert.rejects(() => sagaFinishExplore({
      player_id,
      movement_id,
      arrived_at,
    }), /explore error/)
    assert.strictEqual((finishTroopBaseMovement as MockInstance).mock.calls.length, 0)
  })
})
