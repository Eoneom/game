import { upgradeBuilding } from '#app/command/building/upgrade'
import { BuildingCode } from '#core/building/constant/code'

export const sagaUpgradeBuilding = async ({
  player_id,
  city_id,
  building_code
}: {
  player_id: string
  city_id: string
  building_code: BuildingCode
}): Promise<void> => {
  await upgradeBuilding({
    player_id,
    city_id,
    building_code
  })
}
