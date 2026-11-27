import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { GenericQuery } from '#query/generic'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'

export interface TroopMovementListEntry {
  movement: MovementEntity
  arrive_at: number
  /** Arrived attack still in battle: `arrive_at` is then the battle start (slice 045). */
  battle_id: string | null
  troops: TroopEntity[]
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

    const timed = await Promise.all(movements.map(async (movement) => {
      const arrive_at = await resolveMovementArriveAt({
        movement_id: movement.id,
        job_queue,
      })
      if (arrive_at !== null) {
        return {
          movement,
          arrive_at,
          battle_id: null,
        }
      }

      // An arrived attack keeps its movement row until the battle ends (same rule as `TroopMovementGetQuery`).
      if (movement.action === MovementAction.ATTACK) {
        const battle = await this.repository.battle.getByMovementId(movement.id)
        if (battle && battle.status === 'in_progress') {
          return {
            movement,
            arrive_at: battle.started_at,
            battle_id: battle.id,
          }
        }
      }

      return null
    }))
    const listed = timed.filter((entry): entry is Omit<TroopMovementListEntry, 'troops'> => entry !== null)

    const troops = await this.repository.troop.listByMovementIds({ movement_ids: listed.map(entry => entry.movement.id) })

    return {
      movements: listed.map(entry => ({
        ...entry,
        troops: troops.filter(troop => troop.movement_id === entry.movement.id),
      })),
    }
  }
}
