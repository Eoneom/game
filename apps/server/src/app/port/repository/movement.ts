import { GenericRepository } from '#app/port/repository/generic'
import { MovementEntity } from '#core/troop/movement/entity'

export type MovementRepository = GenericRepository<MovementEntity> & {
  getById(id: string): Promise<MovementEntity>

  list(query: { player_id: string }): Promise<MovementEntity[]>

  countByPlayer(query: { player_id: string }): Promise<number>
}
