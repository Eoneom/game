import { GenericQuery } from '#query/generic'
import { Coordinates } from '#core/world/value/coordinates'
import { TroopCode } from '#core/troop/constant/code'
import { WorldService } from '#core/world/service'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'

export interface TroopMovementEstimateQueryRequest {
  origin: Coordinates
  destination: Coordinates
  troop_codes: TroopCode[]
  troops?: TroopCount[]
}

export interface TroopMovementEstimateQueryResponse {
  distance: number
  duration: number
  speed: number
  transport_capacity: number
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
  }: TroopMovementEstimateQueryRequest): Promise<TroopMovementEstimateQueryResponse> {
    await this.repository.cell.getCell({ coordinates: origin })
    await this.repository.cell.getCell({ coordinates: destination })

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

    return {
      distance,
      speed,
      duration: duration / 1000,
      transport_capacity,
    }
  }
}
