import { GenericQuery } from '#query/generic'
import {
  AppService,
  UNLIMITED_RESOURCE_CAPACITY
} from '#app/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostError } from '#core/outpost/error'
import { OutpostType } from '#core/outpost/constant/type'
import { CellEntity } from '#core/world/cell/entity'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { Resource } from '#shared/resource'
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
      stock_row
    ] = await Promise.all([
      this.repository.cell.getById(outpost.cell_id),
      AppService.getOutpostProductionBreakdown({ outpost_id }),
      this.repository.resource_stock.getByCellId({ cell_id: outpost.cell_id })
    ])

    let resource_stock = stock_row
    if (outpost.type === OutpostType.PERMANENT) {
      const { stock: stock_as_of_now } = stock_row.gather({
        gather_at_time: now(),
        earnings_per_second: production.earnings_per_second,
        warehouses_capacity: UNLIMITED_RESOURCE_CAPACITY
      })
      resource_stock = stock_as_of_now
    }

    return {
      outpost,
      cell,
      resource_stock,
      earnings_per_second: production.earnings_per_second,
      pre_cell_earnings_per_second: production.pre_cell_earnings_per_second,
      cell_resource_coefficient: production.cell_resource_coefficient
    }
  }
}
