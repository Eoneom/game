import { recruitTroop } from '#app/command/troop/recruit'
import { TroopCode } from '#core/troop/constant/code'

export const sagaRecruitTroop = async ({
  city_id,
  troop_code,
  count,
  player_id
}: {
  city_id: string
  troop_code: TroopCode
  count: number
  player_id: string
}): Promise<void> => {
  await recruitTroop({
    city_id,
    count,
    player_id,
    troop_code,
  })
}
