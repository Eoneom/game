import { GenericRepository } from '#app/port/repository/generic'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'

export type DefenseBuildQueueRepository = GenericRepository<DefenseBuildQueueEntity> & {
  listByCity(query: { city_id: string }): Promise<DefenseBuildQueueEntity[]>
  countByCity(query: { city_id: string }): Promise<number>
  getById(id: string): Promise<DefenseBuildQueueEntity>
  deleteByCity(query: { city_id: string }): Promise<void>
}
