import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { GenericQuery } from '#query/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
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
  battle_id: string | null
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

    if (arrive_at !== null) {
      return {
        movement,
        troops,
        arrive_at,
        battle_id: null,
      }
    }

    // An attack that has arrived keeps its movement row until the battle ends:
    // expose it by id (not in lists) so clients can follow the battle.
    if (movement.action === MovementAction.ATTACK) {
      const battle = await this.repository.battle.getByMovementId(movement_id)
      if (battle && battle.status === 'in_progress') {
        return {
          movement,
          troops,
          arrive_at: battle.started_at,
          battle_id: battle.id,
        }
      }
    }

    throw new Error(TroopError.MOVEMENT_NOT_FOUND)
  }
}
