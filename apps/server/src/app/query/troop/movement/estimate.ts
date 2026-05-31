import { resolveOwnedDepositTarget } from '#app/command/troop/movement/shared'
import { GenericQuery } from '#query/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopCount } from '#core/troop/type'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { WorldService } from '#core/world/service'
import { Resource } from '#shared/resource'

export interface TroopMovementEstimateQueryRequest {
  origin: Coordinates
  destination: Coordinates
  troop_codes: TroopCode[]
  troops?: TroopCount[]
  player_id: string
  resources?: Resource
}

export interface TroopMovementEstimateQueryResponse {
  distance: number
  duration: number
  speed: number
  transport_capacity: number
  destination_capacity_exceeded: boolean
}

export class TroopMovementEstimateQuery extends GenericQuery<TroopMovementEstimateQueryRequest, TroopMovementEstimateQueryResponse> {
  constructor() {
    super({ name: 'troop:movement:estimate' })
  }

  protected async get({
    origin,
    destination,
    troop_codes,
    troops = [],
    player_id,
    resources,
  }: TroopMovementEstimateQueryRequest): Promise<TroopMovementEstimateQueryResponse> {
    await this.repository.cell.getCell({ coordinates: origin })
    const destination_cell = await this.repository.cell.getCell({ coordinates: destination })

    const distance = WorldService.getDistance({
      origin: destination,
      destination: origin
    })

    const duration = TroopService.getMovementDuration({
      distance,
      troop_codes
    })

    const speed = TroopService.getSlowestSpeed({ troop_codes })
    const transport_capacity = TroopService.getTotalTransportCapacity({
      troops: troops.length
        ? troops
        : troop_codes.map(code => ({
          code,
          count: 1
        }))
    })

    const destination_capacity_exceeded = await this.isDestinationCapacityExceeded({
      destination_cell,
      player_id,
      resources,
    })

    return {
      distance,
      speed,
      duration: duration / 1000,
      transport_capacity,
      destination_capacity_exceeded,
    }
  }

  private async isDestinationCapacityExceeded({
    destination_cell,
    player_id,
    resources,
  }: {
    destination_cell: CellEntity
    player_id: string
    resources?: Resource
  }): Promise<boolean> {
    if (!resources || (resources.plastic === 0 && resources.mushroom === 0)) {
      return false
    }

    const deposit_target = await resolveOwnedDepositTarget({
      destination_cell,
      player_id,
    })

    if (!deposit_target) {
      return false
    }

    const stock = await this.repository.resource_stock.getByCellId({
      cell_id: deposit_target.cell_id,
    })

    return resources.plastic + stock.plastic > deposit_target.warehouses_capacity.plastic
      || resources.mushroom + stock.mushroom > deposit_target.warehouses_capacity.mushroom
  }
}
