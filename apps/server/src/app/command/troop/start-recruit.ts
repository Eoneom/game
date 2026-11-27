import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#app/scheduling/troop-recruit'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { RequirementError } from '#core/requirement/error'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { now } from '#shared/time'

/** Checks a queued batch can fail at start; the batch is dropped and the next one tried. */
const SKIPPABLE_START_ERRORS = new Set<string>([
  CityError.NOT_ENOUGH_RESOURCES,
  RequirementError.BUILDING_NOT_FULFILLED,
  RequirementError.TECHNOLOGY_NOT_FULFILLED
])

/**
 * Pays for and schedules one recruitment batch in a city.
 * Requirements and resources are checked here, so queued batches are validated when they start.
 */
export async function startTroopRecruitment({
  player_id,
  city_id,
  troop_code,
  count,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  troop_code: TroopCode
  count: number
  started_at?: number
  /** When advancing the queue from an active progress worker, the progress job is still pending. */
  skip_in_progress_check?: boolean
}): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

  const city = await repository.city.get(city_id)
  const city_cell = await repository.cell.getById(city.cell_id)

  if (!skip_in_progress_check) {
    const pending_recruit = await job_queue.getPendingTroopRecruitProgress({ city_id })
    if (pending_recruit) {
      throw new Error(TroopError.ALREADY_IN_PROGRESS)
    }
  }

  const [
    cloning_factory_level,
    replication_catalyst_level,
    levels,
    troop,
  ] = await Promise.all([
    repository.building.getLevel({
      city_id,
      code: BuildingCode.CLONING_FACTORY,
    }),
    repository.technology.getLevel({
      player_id,
      code: TechnologyCode.REPLICATION_CATALYST,
    }),
    AppService.getTroopRequirementLevels({
      city_id,
      player_id,
      troop_code,
    }),
    repository.troop.getInCell({
      cell_id: city_cell.id,
      code: troop_code,
    }),
  ])

  RequirementService.checkTroopRequirement({
    troop_code: troop.code,
    levels,
  })

  const {
    resource, duration
  } = PricingService.getTroopCost({
    code: troop.code,
    count,
    cloning_factory_level,
    replication_catalyst_level,
  })

  const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
  AppService.assertCityResourceStockContext({
    city,
    city_cell,
    stock,
    player_id
  })
  const updated_stock = stock.purchase({ resource })

  const recruitment_time = started_at ?? now()
  const finish_at = recruitment_time + duration * 1000
  const execute_at = nextTroopRecruitProgressAt({
    finish_at,
    remaining_count: count,
    now: recruitment_time
  })

  await repository.resource_stock.updateOne(updated_stock)

  await job_queue.scheduleTroopRecruitProgress({
    player_id,
    city_id,
    troop_id: troop.id,
    remaining_count: count,
    finish_at,
    started_at: recruitment_time,
    last_progress: recruitment_time,
    execute_at
  })
}

async function tryStartTroopRecruitment(params: Parameters<typeof startTroopRecruitment>[0]): Promise<{ started: boolean, error_code?: string }> {
  try {
    await startTroopRecruitment(params)
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

/** Starts the oldest queued batch of the city; drops batches that fail their checks and tries the next one. */
export async function processTroopRecruitQueue({
  player_id,
  city_id,
  started_at
}: {
  player_id: string
  city_id: string
  started_at?: number
}): Promise<void> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:troop:process-queue')

  for (;;) {
    const queue = await repository.troop_recruit_queue.listByCity({ city_id })
    const next = queue[0]
    if (!next) {
      return
    }

    const {
      started, error_code
    } = await tryStartTroopRecruitment({
      player_id,
      city_id,
      troop_code: next.troop_code,
      count: next.count,
      started_at,
      skip_in_progress_check: true
    })

    await repository.troop_recruit_queue.delete(next.id)

    if (started) {
      logger.info('started queued troop recruitment', {
        city_id,
        troop_code: next.troop_code,
        count: next.count,
        queue_item_id: next.id
      })
      return
    }

    logger.info('dropped queued troop recruitment', {
      city_id,
      troop_code: next.troop_code,
      count: next.count,
      queue_item_id: next.id,
      error_code
    })

    Factory.getEventBus().emit(AppEvent.TroopQueueItemDropped, {
      player_id,
      city_id,
      troop_code: next.troop_code,
      error_code: error_code ?? 'unknown'
    })
  }
}
