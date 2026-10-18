import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { GenericQuery } from '#query/generic'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'

export interface TroopMovementGetQueryRequest {
  player_id: string
  movement_id: string
}

export interface TroopMovementGetQueryResponse {
  movement: MovementEntity
  troops: TroopEntity[]
  arrive_at: number
}

export class TroopMovementGetQuery extends GenericQuery<TroopMovementGetQueryRequest, TroopMovementGetQueryResponse> {
  constructor() {
    super({ name: 'troop:movement:get' })
  }

  protected async get({
    player_id,
    movement_id
  }: TroopMovementGetQueryRequest): Promise<TroopMovementGetQueryResponse> {
    const movement = await this.repository.movement.getById(movement_id)
    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_FOUND)
    }

    const [ troops, arrive_at ] = await Promise.all([
      this.repository.troop.listByMovement({ movement_id }),
      resolveMovementArriveAt({
        movement_id,
        job_queue: Factory.getJobQueue(),
      }),
    ])

    if (arrive_at === null) {
      throw new Error(TroopError.MOVEMENT_NOT_FOUND)
    }

    return {
      movement,
      troops,
      arrive_at,
    }
  }
}
