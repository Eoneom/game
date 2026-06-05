import { AuthRepository } from '#app/port/repository/auth'
import { BuildingRepository } from '#app/port/repository/building'
import { BuildingUpgradeQueueRepository } from '#app/port/repository/building-upgrade-queue'
import { CityRepository } from '#app/port/repository/city'
import { PlayerRepository } from '#app/port/repository/player'
import { TechnologyRepository } from '#app/port/repository/technology'
import { CellRepository } from '#app/port/repository/cell'
import { BaseEntity } from '#core/type/base/entity'
import { TroopRepository } from '#app/port/repository/troop'
import { ExplorationRepository } from '#app/port/repository/exploration'
import { MovementRepository } from '#app/port/repository/movement'
import { ReportRepository } from '#app/port/repository/report'
import { OutpostRepository } from '#app/port/repository/outpost'
import { ResourceStockRepository } from '#app/port/repository/resource-stock'

export interface GenericRepository<Entity extends BaseEntity> {
  create(entity: Entity | Omit<Entity, 'id'>): Promise<string>
  updateOne(entity: Entity, options?: { upsert: boolean}): Promise<void>
  delete(id: string): Promise<void>
}

export interface Repository {
  connect(): Promise<void>

  auth: AuthRepository
  building: BuildingRepository
  building_upgrade_queue: BuildingUpgradeQueueRepository
  cell: CellRepository
  resource_stock: ResourceStockRepository
  city: CityRepository
  exploration: ExplorationRepository
  movement: MovementRepository
  outpost: OutpostRepository
  player: PlayerRepository
  report: ReportRepository
  technology: TechnologyRepository
  troop: TroopRepository
}
