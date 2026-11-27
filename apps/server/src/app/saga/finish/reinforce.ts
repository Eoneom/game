import { Factory } from '#adapter/factory'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { finishTroopReinforceMovement } from '#app/command/troop/movement/finish/reinforce'
import { AppEvent } from '#core/events'
import { now } from '#shared/time'

export const sagaFinishReinforce = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}): Promise<void> => {
  const result = await finishTroopReinforceMovement({
    player_id,
    movement_id,
    arrived_at,
  })

  if (result.outcome === 'stationed') {
    Factory.getEventBus().emit(AppEvent.ReinforcementArrived, {
      player_id: result.host_player_id,
      city_id: result.city_id,
      owner_player_id: player_id,
      report_id: result.report_id,
    })
    return
  }

  // The city is no longer allied: the troops come home like explorers (automatic `base` movement).
  if (result.base_arrive_at <= now()) {
    await finishTroopBaseMovement({
      player_id,
      movement_id: result.base_movement.id,
      arrived_at: result.base_arrive_at,
    })
  }
}
