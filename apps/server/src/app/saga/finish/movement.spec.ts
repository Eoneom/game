import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishOneMovement } from './movement'
import { TroopMovementGetActionQuery } from '#query/troop/movement/get-action'
import { sagaFinishBase } from '#app/saga/finish/base'
import { sagaFinishExplore } from '#app/saga/finish/explore'
import { Factory } from '#adapter/factory'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { AppEvent } from '#core/events'

vi.mock('#query/troop/movement/get-action')
vi.mock('#app/saga/finish/base')
vi.mock('#app/saga/finish/explore')

describe('sagaFinishOneMovement', () => {
  const player_id = 'player_id'
  const movement_id = 'movement_id'
  const arrived_at = 1_000

  let getActionRun: MockInstance
  let emit: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    getActionRun = vi.fn().mockResolvedValue({ action: MovementAction.BASE })
    ;(TroopMovementGetActionQuery as unknown as MockInstance).mockImplementation(function () {
      return { run: getActionRun }
    })
    ;(sagaFinishBase as MockInstance).mockResolvedValue({ is_outpost_created: false })
    ;(sagaFinishExplore as MockInstance).mockResolvedValue(undefined)
    emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as any)
    vi.spyOn(Factory, 'getLogger').mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finishes BASE movement and emits TroopMovementFinished', async () => {
    await sagaFinishOneMovement({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.deepStrictEqual((sagaFinishBase as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at,
    })
    assert.strictEqual(emit.mock.calls[0][0], AppEvent.TroopMovementFinished)
    assert.deepStrictEqual(emit.mock.calls[0][1], { player_id })
  })

  it('finishes EXPLORE movement', async () => {
    getActionRun.mockResolvedValue({ action: MovementAction.EXPLORE })

    await sagaFinishOneMovement({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.deepStrictEqual((sagaFinishExplore as MockInstance).mock.calls[0][0], {
      player_id,
      movement_id,
      arrived_at,
    })
    assert.strictEqual((sagaFinishBase as MockInstance).mock.calls.length, 0)
  })

  it('emits OutpostCreated when base finish creates an outpost', async () => {
    ;(sagaFinishBase as MockInstance).mockResolvedValue({ is_outpost_created: true })

    await sagaFinishOneMovement({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual(emit.mock.calls.length, 2)
    assert.strictEqual(emit.mock.calls[1][0], AppEvent.OutpostCreated)
  })

  it('no-ops when movement is already missing', async () => {
    getActionRun.mockRejectedValue(new Error(TroopError.MOVEMENT_NOT_FOUND))

    await sagaFinishOneMovement({
      player_id,
      movement_id,
      arrived_at,
    })

    assert.strictEqual(emit.mock.calls.length, 0)
  })

  it('rethrows unexpected errors', async () => {
    getActionRun.mockRejectedValue(new Error('boom'))

    await assert.rejects(
      () => sagaFinishOneMovement({
        player_id,
        movement_id,
        arrived_at,
      }),
      /boom/
    )
  })
})
