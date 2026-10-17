import { TechnologyResearchQueueEntity } from '#core/technology/research-queue-entity'
import { GenericRepository } from '#app/port/repository/generic'

export type TechnologyResearchQueueRepository = GenericRepository<TechnologyResearchQueueEntity> & {
  listByPlayer(query: { player_id: string }): Promise<TechnologyResearchQueueEntity[]>
  countByPlayer(query: { player_id: string }): Promise<number>
  getById(id: string): Promise<TechnologyResearchQueueEntity>
}
