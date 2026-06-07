import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { AppEvent } from '#core/events'

export interface CityGatherRequest {
  city_id: string
  player_id: string
  gather_at_time: number
}

export async function cityGather({
  city_id,
  player_id,
  gather_at_time,
}: CityGatherRequest): Promise<void> {
  return runCommand('city:gather', async () => {
    const repository = Factory.getRepository()

    const city = await repository.city.get(city_id)

    const [
      city_cell,
      earnings_per_second,
      warehouses_capacity
    ] = await Promise.all([
      repository.cell.getCityCell({ city_id }),
      AppService.getCityEarningsBySecond({
        city_id,
        player_id
      }),
      AppService.getCityWarehousesCapacity({ city_id })
    ])

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })

    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })

    const {
      stock: updated_stock,
      updated
    } = stock.gather({
      gather_at_time,
      earnings_per_second,
      warehouses_capacity
    })

    if (!updated) {
      return
    }

    await repository.resource_stock.updateOne(updated_stock)

    Factory.getEventBus().emit(AppEvent.CityResourcesGathered, {
      city_id,
      player_id
    })
  })
}
