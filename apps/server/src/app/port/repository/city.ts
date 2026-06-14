import { CityEntity } from '#core/city/entity'
import { GenericRepository } from '#app/port/repository/generic'

export type CityRepository = GenericRepository<CityEntity> & {
  count(query: { player_id: string }): Promise<number>
  get(id: string): Promise<CityEntity>
  list (query: { player_id: string }): Promise<CityEntity[]>
  listAll(): Promise<CityEntity[]>
  exist (name: string): Promise<boolean>
  searchByCell(query: { cell_id: string }): Promise<CityEntity | null>
}
