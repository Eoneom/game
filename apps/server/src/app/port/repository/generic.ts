import { AuthRepository } from '#app/port/repository/auth'
import { BuildingRepository } from '#app/port/repository/building'
import { BuildingUpgradeQueueRepository } from '#app/port/repository/building-upgrade-queue'
import { TechnologyResearchQueueRepository } from '#app/port/repository/technology-research-queue'
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
import { BattleRepository } from '#app/port/battle-repository'
import { SystemPlayerMemoryRepository } from '#app/port/repository/system-player-memory'
import { TroopRecruitQueueRepository } from '#app/port/repository/troop-recruit-queue'
import { DefenseRepository } from '#app/port/repository/defense'
import { DefenseBuildQueueRepository } from '#app/port/repository/defense-build-queue'
import { MailRepository } from '#app/port/repository/mail'
import { ChatMessageRepository } from '#app/port/repository/chat-message'
import { PlayerBlockRepository } from '#app/port/repository/player-block'
import { AbuseReportRepository } from '#app/port/repository/abuse-report'
import { AllianceRepository } from '#app/port/repository/alliance'
import { RankingRepository } from '#app/port/repository/ranking'
import { ExchangeRepository } from '#app/port/repository/exchange'

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
  technology_research_queue: TechnologyResearchQueueRepository
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
  troop_recruit_queue: TroopRecruitQueueRepository
  defense: DefenseRepository
  defense_build_queue: DefenseBuildQueueRepository
  battle: BattleRepository
  system_player_memory: SystemPlayerMemoryRepository
  mail: MailRepository
  chat_message: ChatMessageRepository
  player_block: PlayerBlockRepository
  abuse_report: AbuseReportRepository
  alliance: AllianceRepository
  ranking: RankingRepository
  exchange: ExchangeRepository
}
