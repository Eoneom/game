import { CityEntity } from '#core/city/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { GenericRepository } from '#app/port/repository/generic'

export type CityInBounds = {
  city: CityEntity
  coordinates: Coordinates
}

export type CityRepository = GenericRepository<CityEntity> & {
  count(query: { player_id: string }): Promise<number>
  get(id: string): Promise<CityEntity>
  list (query: { player_id: string }): Promise<CityEntity[]>
  listAll(): Promise<CityEntity[]>
  listInBounds(query: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): Promise<CityInBounds[]>
  exist (name: string): Promise<boolean>
  searchByCell(query: { cell_id: string }): Promise<CityEntity | null>
}
