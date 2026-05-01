import { cityGather } from '#app/command/city/gather'
import { now } from '#shared/time'

export const sagaRefreshGameState = async ({
  player_id,
  city_id
}: {
  player_id: string
  city_id: string
}) => {
  await cityGather({
    player_id,
    city_id,
    gather_at_time: now()
  })
}
