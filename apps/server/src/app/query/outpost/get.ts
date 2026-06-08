import { GenericQuery } from '#query/generic'
import { AppService } from '#app/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { OutpostType } from '#core/outpost/constant/type'
import { CellEntity } from '#core/world/cell/entity'
import { ResourcesService } from '#core/resources/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { Resource, WarehouseCapacity } from '#shared/resource'
import { now } from '#shared/time'

export interface OutpostGetQueryRequest {
  player_id: string
  outpost_id: string
}

export interface OutpostGetQueryResponse {
  outpost: OutpostEntity
  cell: CellEntity
  resource_stock: ResourceStockEntity
  earnings_per_second: Resource
  pre_cell_earnings_per_second: Resource
  cell_resource_coefficient: Resource
  warehouses_capacity: WarehouseCapacity
  warehouse_full_in_seconds: WarehouseCapacity
}

export class OutpostGetQuery extends GenericQuery<OutpostGetQueryRequest, OutpostGetQueryResponse> {
  constructor() {
    super({ name: 'outpost:get' })
  }

  protected async get({
    player_id,
    outpost_id
  }: OutpostGetQueryRequest): Promise<OutpostGetQueryResponse> {
    const outpost = await this.repository.outpost.getById(outpost_id)
    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }

    const [
      cell,
      production,
      stock_row,
      warehouses_capacity
    ] = await Promise.all([
      this.repository.cell.getById(outpost.cell_id),
      AppService.getOutpostProductionBreakdown({ outpost_id }),
      this.repository.resource_stock.getByCellId({ cell_id: outpost.cell_id }),
      AppService.getOutpostWarehousesCapacity({ player_id })
    ])

    let resource_stock = stock_row
    if (outpost.type === OutpostType.PERMANENT) {
      const { stock: stock_as_of_now } = stock_row.gather({
        gather_at_time: now(),
        earnings_per_second: production.earnings_per_second,
        warehouses_capacity
      })
      resource_stock = stock_as_of_now
    }

    const warehouse_full_in_seconds: WarehouseCapacity = {
      plastic: ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: warehouses_capacity.plastic - resource_stock.plastic,
        earnings_per_second: production.earnings_per_second.plastic
      }),
      mushroom: ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: warehouses_capacity.mushroom - resource_stock.mushroom,
        earnings_per_second: production.earnings_per_second.mushroom
      })
    }

    return {
      outpost,
      cell,
      resource_stock,
      earnings_per_second: production.earnings_per_second,
      pre_cell_earnings_per_second: production.pre_cell_earnings_per_second,
      cell_resource_coefficient: production.cell_resource_coefficient,
      warehouses_capacity,
      warehouse_full_in_seconds
    }
  }
}
