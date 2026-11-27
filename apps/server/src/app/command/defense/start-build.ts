import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#app/scheduling/troop-recruit'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { RequirementError } from '#core/requirement/error'
import { RequirementService } from '#core/requirement/service'
import { now } from '#shared/time'

/** Checks a queued batch can fail at start; the batch is dropped and the next one tried. */
const SKIPPABLE_START_ERRORS = new Set<string>([
  CityError.NOT_ENOUGH_RESOURCES,
  RequirementError.BUILDING_NOT_FULFILLED,
  RequirementError.TECHNOLOGY_NOT_FULFILLED
])

/**
 * Pays for and schedules one fortification batch in a city.
 * Requirements and resources are checked here, so queued batches are validated when they start;
 * capacity is checked when the batch is requested (it already counts queued points).
 */
export async function startDefenseBuild({
  player_id,
  city_id,
  defense_code,
  count,
  started_at,
  skip_in_progress_check = false
}: {
  player_id: string
  city_id: string
  defense_code: DefenseCode
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
    const pending_build = await job_queue.getPendingDefenseBuildProgress({ city_id })
    if (pending_build) {
      throw new Error(DefenseError.ALREADY_IN_PROGRESS)
    }
  }

  const [
    city_wall_level,
    levels,
  ] = await Promise.all([
    repository.building.getLevel({
      city_id,
      code: BuildingCode.CITY_WALL,
    }),
    AppService.getDefenseRequirementLevels({
      city_id,
      player_id,
      defense_code,
    }),
  ])

  RequirementService.checkDefenseRequirement({
    defense_code,
    levels,
  })

  const {
    resource, duration
  } = PricingService.getDefenseCost({
    code: defense_code,
    count,
    city_wall_level,
  })

  const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
  AppService.assertCityResourceStockContext({
    city,
    city_cell,
    stock,
    player_id
  })
  const updated_stock = stock.purchase({ resource })

  const build_time = started_at ?? now()
  const finish_at = build_time + duration * 1000
  const execute_at = nextTroopRecruitProgressAt({
    finish_at,
    remaining_count: count,
    now: build_time
  })

  await repository.resource_stock.updateOne(updated_stock)

  await job_queue.scheduleDefenseBuildProgress({
    player_id,
    city_id,
    defense_code,
    remaining_count: count,
    finish_at,
    started_at: build_time,
    last_progress: build_time,
    execute_at
  })
}

async function tryStartDefenseBuild(params: Parameters<typeof startDefenseBuild>[0]): Promise<{ started: boolean, error_code?: string }> {
  try {
    await startDefenseBuild(params)
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
export async function processDefenseBuildQueue({
  player_id,
  city_id,
  started_at
}: {
  player_id: string
  city_id: string
  started_at?: number
}): Promise<void> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:defense:process-queue')

  for (;;) {
    const queue = await repository.defense_build_queue.listByCity({ city_id })
    const next = queue[0]
    if (!next) {
      return
    }

    const {
      started, error_code
    } = await tryStartDefenseBuild({
      player_id,
      city_id,
      defense_code: next.defense_code,
      count: next.count,
      started_at,
      skip_in_progress_check: true
    })

    await repository.defense_build_queue.delete(next.id)

    if (started) {
      logger.info('started queued defense build', {
        city_id,
        defense_code: next.defense_code,
        count: next.count,
        queue_item_id: next.id
      })
      return
    }

    logger.info('dropped queued defense build', {
      city_id,
      defense_code: next.defense_code,
      count: next.count,
      queue_item_id: next.id,
      error_code
    })

    Factory.getEventBus().emit(AppEvent.DefenseQueueItemDropped, {
      player_id,
      city_id,
      defense_code: next.defense_code,
      error_code: error_code ?? 'unknown'
    })
  }
}
