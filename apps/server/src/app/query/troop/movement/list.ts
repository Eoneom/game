import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { GenericQuery } from '#query/generic'
import { MovementEntity } from '#core/troop/movement/entity'

export interface TroopMovementListEntry {
  movement: MovementEntity
  arrive_at: number
}

export interface TroopMovementListQueryRequest {
  player_id: string
}

export interface TroopMovementListQueryResponse {
  movements: TroopMovementListEntry[]
}

export class TroopMovementListQuery extends GenericQuery<TroopMovementListQueryRequest, TroopMovementListQueryResponse> {
  constructor() {
    super({ name: 'troop:movement:list' })
  }

  protected async get({ player_id }: TroopMovementListQueryRequest): Promise<TroopMovementListQueryResponse> {
    const movements = await this.repository.movement.list({ player_id })
    const job_queue = Factory.getJobQueue()

    const entries = await Promise.all(movements.map(async (movement) => {
      const arrive_at = await resolveMovementArriveAt({
        movement_id: movement.id,
        job_queue,
        battle_repository: this.repository.battle,
      })
      if (arrive_at === null) {
        return null
      }

      return {
        movement,
        arrive_at,
      }
    }))

    return {
      movements: entries.filter((entry): entry is TroopMovementListEntry => entry !== null),
    }
  }
}
