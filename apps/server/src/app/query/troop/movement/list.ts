import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopError } from '#core/troop/error'

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
      const pending = await job_queue.getPendingTroopMovementFinish({ movement_id: movement.id })
      if (!pending) {
        throw new Error(TroopError.MOVEMENT_NOT_FOUND)
      }

      return {
        movement,
        arrive_at: pending.execute_at,
      }
    }))

    return { movements: entries }
  }
}
