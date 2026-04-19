import { Factory } from '#adapter/factory'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'

export interface BuildingFinishUpgradeRequest {
  player_id: string
  city_id: string
  building_id: string
  level: number
  upgraded_at: number
}

export type BuildingFinishUpgradeResult = {
  code: BuildingCode
  upgraded_at: number
} | null

export async function finishBuildingUpgrade({
  player_id,
  city_id,
  building_id,
  level,
  upgraded_at,
}: BuildingFinishUpgradeRequest): Promise<BuildingFinishUpgradeResult> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:building:finish-upgrade')
  logger.info('run')

  const city = await repository.city.get(city_id)

  if (!city.isOwnedBy(player_id)) {
    throw new Error(CityError.NOT_OWNER)
  }

  const building_to_finish = await repository.building.getById(building_id)

  if (building_to_finish.city_id !== city_id) {
    throw new Error(CityError.NOT_OWNER)
  }

  if (building_to_finish.level !== level) {
    logger.info('building already finished or level mismatch', {
      building_id,
      expected_level: level,
      actual_level: building_to_finish.level
    })
    return null
  }

  const building = building_to_finish.finishUpgrade()

  await repository.building.updateOne(building)

  Factory.getEventBus().emit(AppEvent.BuildingUpgradeFinished, {
    city_id,
    player_id
  })

  return {
    code: building.code,
    upgraded_at
  }
}
