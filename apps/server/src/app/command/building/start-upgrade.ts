import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { PricingService } from '#core/pricing/service'
import { RequirementError } from '#core/requirement/error'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { now } from '#shared/time'

const SKIPPABLE_START_ERRORS = new Set<string>([
  CityError.NOT_ENOUGH_SPACE,
  CityError.NOT_ENOUGH_RESOURCES,
  RequirementError.BUILDING_NOT_FULFILLED,
  RequirementError.TECHNOLOGY_NOT_FULFILLED
])

export async function startBuildingUpgrade({
  player_id,
  city_id,
  building_code,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  building_code: BuildingCode
  started_at?: number
  /** When advancing the queue from an active finish worker, the finish job is still pending. */
  skip_in_progress_check?: boolean
}): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

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

  const [
    city,
    city_cell,
    building,
    levels,
    pending_upgrade
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
    }),
    skip_in_progress_check
      ? Promise.resolve(null)
      : job_queue.getPendingBuildingUpgrade({ city_id })
  ])

  building.assertCanUpgrade({ is_building_in_progress: pending_upgrade !== null })

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
  const execute_at = (started_at ?? now()) + duration * 1000

  await repository.resource_stock.updateOne(updated_stock)

  await job_queue.scheduleBuildingUpgradeFinish({
    player_id,
    city_id,
    building_id: building.id,
    level: building.level,
    execute_at
  })
}

export async function tryStartBuildingUpgrade({
  player_id,
  city_id,
  building_code,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  building_code: BuildingCode
  started_at?: number
  skip_in_progress_check?: boolean
}): Promise<boolean> {
  try {
    await startBuildingUpgrade({
      player_id,
      city_id,
      building_code,
      started_at,
      skip_in_progress_check
    })
    return true
  } catch (error) {
    if (error instanceof Error && SKIPPABLE_START_ERRORS.has(error.message)) {
      return false
    }
    throw error
  }
}

export async function processBuildingUpgradeQueue({
  player_id,
  city_id,
  started_at
}: {
  player_id: string
  city_id: string
  started_at?: number
}): Promise<void> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:building:process-queue')

  while (true) {
    const queue = await repository.building_upgrade_queue.listByCity({ city_id })
    const next = queue[0]
    if (!next) {
      return
    }

    const started = await tryStartBuildingUpgrade({
      player_id,
      city_id,
      building_code: next.building_code,
      started_at,
      skip_in_progress_check: true
    })

    await repository.building_upgrade_queue.delete(next.id)

    if (started) {
      logger.info('started queued building upgrade', {
        city_id,
        building_code: next.building_code,
        queue_item_id: next.id
      })
      return
    }

    logger.info('dropped queued building upgrade', {
      city_id,
      building_code: next.building_code,
      queue_item_id: next.id
    })
  }
}
