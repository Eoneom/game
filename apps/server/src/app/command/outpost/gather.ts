import { Factory } from '#adapter/factory'
import {
  AppService,
  UNLIMITED_RESOURCE_CAPACITY
} from '#app/service'
import { runCommand } from '#command/run'
import { AppEvent } from '#core/events'
import { OutpostType } from '#core/outpost/constant/type'

export interface OutpostGatherRequest {
  outpost_id: string
  player_id: string
  gather_at_time: number
}

export async function outpostGather({
  outpost_id,
  player_id,
  gather_at_time,
}: OutpostGatherRequest): Promise<void> {
  return runCommand('outpost:gather', async () => {
    const repository = Factory.getRepository()

    const outpost = await repository.outpost.getById(outpost_id)
    if (outpost.type !== OutpostType.PERMANENT) {
      return
    }

    const [
      cell,
      earnings_per_second
    ] = await Promise.all([
      repository.cell.getById(outpost.cell_id),
      AppService.getOutpostEarningsBySecond({ outpost_id })
    ])

    const stock = await repository.resource_stock.getByCellId({ cell_id: cell.id })

    AppService.assertOutpostResourceStockContext({
      outpost,
      cell,
      stock,
      player_id
    })

    const {
      stock: updated_stock,
      updated
    } = stock.gather({
      gather_at_time,
      earnings_per_second,
      warehouses_capacity: UNLIMITED_RESOURCE_CAPACITY
    })

    if (!updated) {
      return
    }

    await repository.resource_stock.updateOne(updated_stock)

    Factory.getEventBus().emit(AppEvent.OutpostResourcesGathered, {
      outpost_id,
      player_id
    })
  })
}
