import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { finishExchangeMovement } from '#app/command/troop/movement/finish/exchange'
import { now } from '#shared/time'

/** Exchange convoy arrival (slice 035), then the carriers' return or the redirected leg when already due. */
export const sagaFinishExchange = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}): Promise<void> => {
  const result = await finishExchangeMovement({
    player_id,
    movement_id,
    arrived_at,
  })

  if (result.kind === 'redirected') {
    if (result.arrive_at <= now()) {
      await sagaFinishExchange({
        player_id,
        movement_id: result.movement.id,
        arrived_at: result.arrive_at,
      })
    }
    return
  }

  if (result.base_arrive_at <= now()) {
    await finishTroopBaseMovement({
      player_id,
      movement_id: result.base_movement.id,
      arrived_at: result.base_arrive_at,
    })
  }
}
