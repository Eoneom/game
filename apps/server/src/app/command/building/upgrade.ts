import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { now } from '#shared/time'

export interface BuildingUpgradeRequest {
  player_id: string
  city_id: string
  building_code: BuildingCode
}

export async function upgradeBuilding({
  player_id,
  city_id,
  building_code,
}: BuildingUpgradeRequest): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const logger = Factory.getLogger('app:command:building:upgrade')
  logger.info('run')

  const [
    maximum_building_levels,
    total_building_levels,
  ] = await Promise.all([
    AppService.getCityMaximumBuildingLevels({ city_id }),
    repository.building.getTotalLevels({ city_id }),
  ])

  if (total_building_levels >= maximum_building_levels) {
    throw new Error(CityError.NOT_ENOUGH_SPACE)
  }

  const pending_upgrade = await job_queue.getPendingBuildingUpgrade({ city_id })
  const is_building_in_progress = pending_upgrade !== null

  const [
    city,
    city_cell,
    building,
    levels
  ] = await Promise.all([
    repository.city.get(city_id),
    repository.cell.getCityCell({ city_id }),
    repository.building.get({
      city_id,
      code: building_code
    }),
    AppService.getBuildingRequirementLevels({
      city_id,
      player_id,
      building_code
    })
  ])

  building.assertCanUpgrade({ is_building_in_progress })

  RequirementService.checkBuildingRequirement({
    building_code: building.code,
    levels
  })

  const architecture_technology = await repository.technology.get({
    player_id,
    code: TechnologyCode.ARCHITECTURE
  })

  const {
    resource,
    duration
  } = PricingService.getBuildingLevelCost({
    level: building.level + 1,
    code: building.code,
    architecture_level: architecture_technology.level
  })
  const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
  AppService.assertCityResourceStockContext({
    city,
    city_cell,
    stock,
    player_id
  })
  const updated_stock = stock.purchase({ resource })
  const execute_at = now() + duration * 1000

  await repository.resource_stock.updateOne(updated_stock)

  await job_queue.scheduleBuildingUpgradeFinish({
    player_id,
    city_id,
    building_id: building.id,
    level: building.level,
    execute_at
  })
}
