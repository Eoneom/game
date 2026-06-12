import { GenericRepository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'

export type CellRepository = GenericRepository<CellEntity> & {
  isInitialized(): Promise<boolean>

  getByBounds(query: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): Promise<CellEntity[]>
  getCityCell(query: { city_id: string }): Promise<CellEntity>
  getCityCellsCount(query: { city_id: string }): Promise<number>
  getById(id: string): Promise<CellEntity>
  getCell(query: { coordinates: Coordinates }): Promise<CellEntity>
}
