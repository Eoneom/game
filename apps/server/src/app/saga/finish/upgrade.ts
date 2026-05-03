import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'

export const sagaFinishUpgrade = async ({
  player_id,
  city_id,
  building_id,
  level,
  upgraded_at
}: {
  player_id: string
  city_id: string
  building_id: string
  level: number
  upgraded_at: number
}): Promise<void> => {
  await finishBuildingUpgrade({
    player_id,
    city_id,
    building_id,
    level,
    upgraded_at,
  })
}
