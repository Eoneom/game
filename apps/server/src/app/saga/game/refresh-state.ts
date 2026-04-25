import { cityGather } from '#app/command/city/gather'
import { now } from '#shared/time'
import { sagaFinishMovement } from '../finish/movement'

export const sagaRefreshGameState = async ({
  player_id,
  city_id
}: {
  player_id: string
  city_id: string
}) => {
  await sagaFinishMovement({ player_id })

  await cityGather({
    player_id,
    city_id,
    gather_at_time: now()
  })
}
