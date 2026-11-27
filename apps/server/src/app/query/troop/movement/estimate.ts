import { resolveOwnedDepositTarget } from '#app/command/troop/movement/shared'
import { AppService } from '#app/service'
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

/** Bonuses the estimate applied (slice 045 summary « Bonus appliqués »). */
interface TroopMovementEstimateModifiers {
  propulsion_level: number
  non_combat_speed_multiplier: number
  carrier_capacity_multiplier: number
}

export interface TroopMovementEstimateQueryResponse {
  distance: number
  /** Seconds. */
  duration: number
  speed: number
  transport_capacity: number
  destination_capacity_exceeded: boolean
  modifiers: TroopMovementEstimateModifiers
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

    const [
      propulsion_level,
      logistics
    ] = await Promise.all([
      AppService.getTacticalPropulsionLevel({ player_id }),
      // The estimate shows the faction logistics bonus (slice 039), as the movement will get it.
      AppService.getLogisticsModifier({ player_id }),
    ])

    const duration = TroopService.getMovementDuration({
      distance,
      troop_codes,
      propulsion_level,
      non_combat_speed_multiplier: logistics.non_combat_speed,
    })

    const speed = TroopService.getSlowestSpeed({
      troop_codes,
      propulsion_level,
      non_combat_speed_multiplier: logistics.non_combat_speed,
    })
    const transport_capacity = TroopService.getTotalTransportCapacity({
      troops: troops.length
        ? troops
        : troop_codes.map(code => ({
          code,
          count: 1
        })),
      carrier_capacity_multiplier: logistics.transport_capacity,
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
      modifiers: {
        propulsion_level,
        non_combat_speed_multiplier: logistics.non_combat_speed,
        carrier_capacity_multiplier: logistics.transport_capacity,
      },
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
    if (!resources || (resources.plastic === 0 && resources.mushroom === 0 && resources.water === 0)) {
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

    const water_capacity = deposit_target.warehouses_capacity.water

    return resources.plastic + stock.plastic > deposit_target.warehouses_capacity.plastic
      || resources.mushroom + stock.mushroom > deposit_target.warehouses_capacity.mushroom
      // Outposts store no water (slice 035); cities have no water cap.
      || (water_capacity !== undefined && resources.water + stock.water > water_capacity)
  }
}
