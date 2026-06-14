import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { processBuildingUpgradeQueue } from '#app/command/building/start-upgrade'
import { AppService } from '#app/service'
import { BuildingError } from '#core/building/error'
import { PricingService } from '#core/pricing/service'

export interface BuildingCancelRequest {
  city_id: string
  player_id: string
}

export async function cancelBuilding({
  city_id,
  player_id,
}: BuildingCancelRequest): Promise<void> {
  return runCommand('building:cancel', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const pending = await job_queue.getPendingBuildingUpgrade({ city_id })

    if (!pending) {
      throw new Error(BuildingError.NOT_IN_PROGRESS)
    }

    const building = await repository.building.getById(pending.building_id)

    const city = await repository.city.get(city_id)
    const city_cell = await repository.cell.getById(city.cell_id)

    const resource_refund = PricingService.getBuildingUpgradeRefund({
      code: building.code,
      level: building.level
    })

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.refund({ resource: resource_refund })

    await Promise.all([
      repository.resource_stock.updateOne(updated_stock),
      job_queue.cancelBuildingUpgradeFinish({ city_id })
    ])

    await processBuildingUpgradeQueue({
      player_id,
      city_id
    })
  })
}
