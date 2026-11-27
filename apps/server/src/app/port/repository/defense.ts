import { GenericRepository } from '#app/port/repository/generic'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'

export type DefenseRepository = GenericRepository<DefenseEntity> & {
  listByCity(query: { city_id: string }): Promise<DefenseEntity[]>
  /** Adds built units, creating the `(city_id, code)` row if it was deleted. */
  addCount(query: { player_id: string, city_id: string, code: DefenseCode, count: number }): Promise<void>
  /** Removes lost units (never below 0). */
  removeCount(query: { city_id: string, code: DefenseCode, count: number }): Promise<void>
  deleteByCity(query: { city_id: string }): Promise<void>
}
