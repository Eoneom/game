import { GenericRepository } from '#app/port/repository/generic'
import { OutpostEntity } from '#core/outpost/entity'
import { Coordinates } from '#core/world/value/coordinates'

export type OutpostInBounds = {
  outpost: OutpostEntity
  coordinates: Coordinates
}

export type OutpostRepository = GenericRepository<OutpostEntity> & {
  searchByCell({ cell_id }: { cell_id: string }): Promise<OutpostEntity | null>

  getById(id: string): Promise<OutpostEntity>

  existsOnCell(query: { cell_id: string }): Promise<boolean>

  countForPlayer(query: { player_id: string }): Promise<number>

  list(query: { player_id: string }): Promise<OutpostEntity[]>

  listInBounds(query: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): Promise<OutpostInBounds[]>

  listPermanent(): Promise<OutpostEntity[]>
}
