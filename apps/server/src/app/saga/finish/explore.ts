import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { finishTroopExploreMovement } from '#app/command/troop/movement/finish/explore'
import { now } from '#shared/time'

export const sagaFinishExplore = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}) => {
  const { base_movement, base_arrive_at } = await finishTroopExploreMovement({
    player_id,
    movement_id,
    arrived_at,
  })

  if (base_arrive_at <= now()) {
    await finishTroopBaseMovement({
      player_id,
      movement_id: base_movement.id,
      arrived_at: base_arrive_at,
    })
  }
}
