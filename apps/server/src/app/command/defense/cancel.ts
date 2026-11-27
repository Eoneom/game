import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { processDefenseBuildQueue } from '#app/command/defense/start-build'
import { AppService } from '#app/service'
import { CityError } from '#core/city/error'
import { DefenseError } from '#core/defense/error'
import { PricingService } from '#core/pricing/service'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'

interface CancelDefenseBuildParams {
  city_id: string
  player_id: string
}

/** Keeps the units already built and refunds the remaining ones in full (same as troop cancel). */
export async function cancelDefenseBuild({
  city_id,
  player_id,
}: CancelDefenseBuildParams): Promise<void> {
  return runCommand('defense:cancel', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const pending = await job_queue.getPendingDefenseBuildProgress({ city_id })
    if (!pending) {
      throw new Error(DefenseError.NOT_IN_PROGRESS)
    }

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }
    const city_cell = await repository.cell.getById(city.cell_id)

    const progressed = TroopService.progressRecruitment({
      count: 0,
      recruitment: {
        remaining_count: pending.remaining_count,
        finish_at: pending.finish_at,
        started_at: pending.started_at,
        last_progress: pending.last_progress
      },
      progress_time: now()
    })

    const refund = PricingService.getDefenseCost({
      code: pending.defense_code,
      count: progressed.recruitment?.remaining_count ?? 0,
      city_wall_level: 0,
    })

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.refund({ resource: refund.resource })

    await Promise.all([
      progressed.count > 0
        ? repository.defense.addCount({
          player_id,
          city_id,
          code: pending.defense_code,
          count: progressed.count
        })
        : Promise.resolve(),
      repository.resource_stock.updateOne(updated_stock),
      job_queue.cancelDefenseBuildProgress({ city_id })
    ])

    await processDefenseBuildQueue({
      player_id,
      city_id
    })
  })
}
