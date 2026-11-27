import type { MockInstance } from 'vitest'
import { sagaFinishReinforce } from './reinforce'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { finishTroopReinforceMovement } from '#app/command/troop/movement/finish/reinforce'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { AppEvent } from '#core/events'
import { now } from '#shared/time'

vi.mock('#app/command/troop/movement/finish/reinforce')
vi.mock('#app/command/troop/movement/finish/base')

describe('sagaFinishReinforce (slice 033)', () => {
  let emit: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    ;(finishTroopBaseMovement as unknown as MockInstance).mockResolvedValue({ is_outpost_created: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tells the host that reinforcements arrived', async () => {
    (finishTroopReinforceMovement as unknown as MockInstance).mockResolvedValue({
      outcome: 'stationed',
      host_player_id: 'host',
      city_id: 'city',
      report_id: 'report',
    })

    await sagaFinishReinforce({
      player_id: 'owner',
      movement_id: 'movement',
      arrived_at: 1000
    })

    expect(emit).toHaveBeenCalledWith(AppEvent.ReinforcementArrived, {
      player_id: 'host',
      city_id: 'city',
      owner_player_id: 'owner',
      report_id: 'report',
    })
    expect(finishTroopBaseMovement).not.toHaveBeenCalled()
  })

  it('finishes an automatic return that already arrived', async () => {
    const base_arrive_at = now() - 1000
    ;(finishTroopReinforceMovement as unknown as MockInstance).mockResolvedValue({
      outcome: 'returned',
      base_movement: { id: 'base' },
      base_arrive_at,
    })

    await sagaFinishReinforce({
      player_id: 'owner',
      movement_id: 'movement',
      arrived_at: 1000
    })

    expect(emit).not.toHaveBeenCalled()
    expect(finishTroopBaseMovement).toHaveBeenCalledWith({
      player_id: 'owner',
      movement_id: 'base',
      arrived_at: base_arrive_at,
    })
  })
})
