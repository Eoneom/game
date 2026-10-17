import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { RequirementError } from '#core/requirement/error'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { now } from '#shared/time'

const SKIPPABLE_START_ERRORS = new Set<string>([
  CityError.NOT_ENOUGH_RESOURCES,
  CityError.NOT_OWNER,
  RequirementError.BUILDING_NOT_FULFILLED,
  RequirementError.TECHNOLOGY_NOT_FULFILLED
])

export async function startTechnologyResearch({
  player_id,
  city_id,
  technology_code,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
  started_at?: number
  skip_in_progress_check?: boolean
}): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

  const pending_research = skip_in_progress_check
    ? null
    : await job_queue.getPendingTechnologyResearch({ player_id })

  const [
    city,
    technology,
  ] = await Promise.all([
    repository.city.get(city_id),
    repository.technology.get({
      player_id,
      code: technology_code
    }),
  ])
  const city_cell = await repository.cell.getById(city.cell_id)

  technology.assertCanResearch({ is_technology_in_progress: pending_research !== null })

  const levels = await AppService.getTechnologyRequirementLevels({
    city_id,
    player_id,
    technology_code,
    technology_level: technology.level
  })

  RequirementService.checkTechnologyRequirement({
    technology_code: technology.code,
    technology_level: technology.level,
    levels,
  })

  const research_lab = await repository.building.get({
    city_id,
    code: BuildingCode.RESEARCH_LAB
  })

  const {
    resource,
    duration
  } = PricingService.getTechnologyLevelCost({
    code: technology.code,
    level: technology.level + 1,
    research_lab_level: research_lab.level
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

  await job_queue.scheduleTechnologyResearchFinish({
    player_id,
    city_id,
    technology_id: technology.id,
    level: technology.level,
    execute_at
  })
}

export async function tryStartTechnologyResearch({
  player_id,
  city_id,
  technology_code,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
  started_at?: number
  skip_in_progress_check?: boolean
}): Promise<{ started: boolean, error_code?: string }> {
  try {
    await startTechnologyResearch({
      player_id,
      city_id,
      technology_code,
      started_at,
      skip_in_progress_check
    })
    return { started: true }
  } catch (error) {
    if (error instanceof Error && SKIPPABLE_START_ERRORS.has(error.message)) {
      return {
        started: false,
        error_code: error.message
      }
    }
    throw error
  }
}

export async function processTechnologyResearchQueue({
  player_id,
  started_at
}: {
  player_id: string
  started_at?: number
}): Promise<void> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:technology:process-queue')

  while (true) {
    const queue = await repository.technology_research_queue.listByPlayer({ player_id })
    const next = queue[0]
    if (!next) {
      return
    }

    const { started, error_code } = await tryStartTechnologyResearch({
      player_id,
      city_id: next.city_id,
      technology_code: next.technology_code,
      started_at,
      skip_in_progress_check: true
    })

    await repository.technology_research_queue.delete(next.id)

    if (started) {
      logger.info('started queued technology research', {
        player_id,
        city_id: next.city_id,
        technology_code: next.technology_code,
        queue_item_id: next.id
      })
      return
    }

    logger.info('dropped queued technology research', {
      player_id,
      city_id: next.city_id,
      technology_code: next.technology_code,
      queue_item_id: next.id,
      error_code
    })

    Factory.getEventBus().emit(AppEvent.TechnologyQueueItemDropped, {
      player_id,
      city_id: next.city_id,
      technology_code: next.technology_code,
      error_code: error_code ?? 'unknown'
    })
  }
}
