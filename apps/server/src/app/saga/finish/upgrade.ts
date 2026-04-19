import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { cityGather } from '#app/command/city/gather'
import {
  isProductionBuildingCode, isWarehouseBuildingCode
} from '#core/building/helper'

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
  const upgrade_result = await finishBuildingUpgrade({
    player_id,
    city_id,
    building_id,
    level,
    upgraded_at,
  })

  if (upgrade_result && (isProductionBuildingCode(upgrade_result.code) || isWarehouseBuildingCode(upgrade_result.code))) {
    await cityGather({
      player_id,
      city_id,
      gather_at_time: upgrade_result.upgraded_at
    })
  }
}
