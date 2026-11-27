import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import { GenericRepository } from '#app/port/repository/generic'

export type TroopRecruitQueueRepository = GenericRepository<TroopRecruitQueueEntity> & {
  listByCity(query: { city_id: string }): Promise<TroopRecruitQueueEntity[]>
  countByCity(query: { city_id: string }): Promise<number>
  getById(id: string): Promise<TroopRecruitQueueEntity>
  deleteByCity(query: { city_id: string }): Promise<void>
}
