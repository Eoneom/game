import { PlayerEntity } from '#core/player/entity'
import { GenericRepository } from '#app/port/repository/generic'

export type PlayerRepository = GenericRepository<PlayerEntity> & {
  exist(name: string): Promise<boolean>
  get(id: string): Promise<PlayerEntity>
  getByName(name: string): Promise<PlayerEntity>
  listByIds(ids: string[]): Promise<PlayerEntity[]>
  listSystemControlled(): Promise<PlayerEntity[]>
  /** Human players whose name starts with `prefix` (case-insensitive), sorted by name. */
  searchHumansByNamePrefix(args: { prefix: string, limit: number }): Promise<PlayerEntity[]>
  /** Voluntary alliance departure time (slice 033 cooldown). */
  setAllianceLeftAt(args: { player_id: string, left_at: number | null }): Promise<void>
}
