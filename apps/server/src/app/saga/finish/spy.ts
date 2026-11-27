import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { finishTroopSpyMovement } from '#app/command/troop/movement/finish/spy'
import { now } from '#shared/time'

export const sagaFinishSpy = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}) => {
  const result = await finishTroopSpyMovement({
    player_id,
    movement_id,
    arrived_at,
  })

  // Scouts that survived come home like explorers (automatic `base` movement).
  if (result.outcome !== 'failure' && result.base_arrive_at <= now()) {
    await finishTroopBaseMovement({
      player_id,
      movement_id: result.base_movement.id,
      arrived_at: result.base_arrive_at,
    })
  }
}
