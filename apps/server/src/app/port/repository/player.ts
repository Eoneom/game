import { PlayerEntity } from '#core/player/entity'
import { GenericRepository } from '#app/port/repository/generic'

export type PlayerRepository = GenericRepository<PlayerEntity> & {
  exist(name: string): Promise<boolean>
  get(id: string): Promise<PlayerEntity>
  getByName(name: string): Promise<PlayerEntity>
}
