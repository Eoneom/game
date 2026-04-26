import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { TroopError } from '#core/troop/error'
import { PricingService } from '#core/pricing/service'
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

    const [
      city,
      city_cell
    ] = await Promise.all([
      repository.city.get(city_id),
      repository.cell.getCityCell({ city_id })
    ])

    const troop = await repository.troop.getInProgress({ cell_id: city_cell.id })

    if (!troop) {
      throw new Error(TroopError.NOT_IN_PROGRESS)
    }

    const updated_troop = troop.progressRecruitment({ progress_time: now() })
    const troop_costs = PricingService.getTroopCost({
      code: troop.code,
      count: updated_troop.ongoing_recruitment?.remaining_count ?? 0,
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

    const troop_to_save = updated_troop.cancel()

    await Promise.all([
      repository.troop.updateOne(troop_to_save),
      repository.resource_stock.updateOne(updated_stock),
    ])
  })
}
