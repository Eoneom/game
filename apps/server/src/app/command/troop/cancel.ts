import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { TroopError } from '#core/troop/error'
import { PricingService } from '#core/pricing/service'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'

export interface CancelTroopParams {
  city_id: string
  player_id: string
}

export async function cancelTroop({
  city_id,
  player_id,
}: CancelTroopParams): Promise<void> {
  return runCommand('troop:cancel', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const pending = await job_queue.getPendingTroopRecruitProgress({ city_id })

    if (!pending) {
      throw new Error(TroopError.NOT_IN_PROGRESS)
    }

    const [
      city,
      troop
    ] = await Promise.all([
      repository.city.get(city_id),
      repository.troop.getById(pending.troop_id)
    ])
    const city_cell = await repository.cell.getById(city.cell_id)

    const progressed = TroopService.progressRecruitment({
      count: troop.count,
      recruitment: {
        remaining_count: pending.remaining_count,
        finish_at: pending.finish_at,
        started_at: pending.started_at,
        last_progress: pending.last_progress
      },
      progress_time: now()
    })

    const troop_costs = PricingService.getTroopCost({
      code: troop.code,
      count: progressed.recruitment?.remaining_count ?? 0,
      cloning_factory_level: 0,
      replication_catalyst_level: 0,
    })

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.refund({ resource: troop_costs.resource })

    await Promise.all([
      repository.troop.updateOne(TroopEntity.create({
        ...troop,
        count: progressed.count
      })),
      repository.resource_stock.updateOne(updated_stock),
      job_queue.cancelTroopRecruitProgress({ city_id })
    ])
  })
}
