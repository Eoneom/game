import { AppService } from '#app/service'
import { GenericQuery } from '#query/generic'

interface TroopMovementCapacityQueryRequest {
  player_id: string
}

interface TroopMovementCapacityQueryResponse {
  used: number
  limit: number
}

export class TroopMovementCapacityQuery extends GenericQuery<TroopMovementCapacityQueryRequest, TroopMovementCapacityQueryResponse> {
  constructor() {
    super({ name: 'troop:movement:capacity' })
  }

  protected async get({ player_id }: TroopMovementCapacityQueryRequest): Promise<TroopMovementCapacityQueryResponse> {
    return AppService.getMovementCapacity({ player_id })
  }
}
