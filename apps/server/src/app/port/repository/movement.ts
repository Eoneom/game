import { GenericRepository } from '#app/port/repository/generic'
import { MovementEntity } from '#core/troop/movement/entity'

export type MovementRepository = GenericRepository<MovementEntity> & {
  getById(id: string): Promise<MovementEntity>

  list(query: { player_id: string }): Promise<MovementEntity[]>

  countByPlayer(query: { player_id: string }): Promise<number>

  /**
   * `attack` movements of other players whose destination cell holds one of the player's cities,
   * outposts or stationary troops (slice 030). Arrived attacks are included; callers drop hidden ones.
   */
  listIncomingAttacks(query: { player_id: string }): Promise<MovementEntity[]>
}
