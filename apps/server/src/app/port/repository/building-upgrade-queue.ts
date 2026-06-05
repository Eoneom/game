import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { GenericRepository } from '#app/port/repository/generic'

export type BuildingUpgradeQueueRepository = GenericRepository<BuildingUpgradeQueueEntity> & {
  listByCity(query: { city_id: string }): Promise<BuildingUpgradeQueueEntity[]>
  countByCity(query: { city_id: string }): Promise<number>
  getById(id: string): Promise<BuildingUpgradeQueueEntity>
}
