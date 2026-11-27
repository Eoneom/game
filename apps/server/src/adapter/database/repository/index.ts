import { Factory } from '#adapter/factory'
import {
  getRootDatabase,
  setRootDatabase
} from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import { Repository } from '#app/port/repository/generic'
import { AuthRepository } from '#app/port/repository/auth'
import { BuildingRepository } from '#app/port/repository/building'
import { BuildingUpgradeQueueRepository } from '#app/port/repository/building-upgrade-queue'
import { CityRepository } from '#app/port/repository/city'
import { PlayerRepository } from '#app/port/repository/player'
import { TechnologyRepository } from '#app/port/repository/technology'
import { CellRepository } from '#app/port/repository/cell'
import { TroopRepository } from '#app/port/repository/troop'
import { ExplorationRepository } from '#app/port/repository/exploration'
import { MovementRepository } from '#app/port/repository/movement'
import { ReportRepository } from '#app/port/repository/report'
import { OutpostRepository } from '#app/port/repository/outpost'
import { ResourceStockRepository } from '#app/port/repository/resource-stock'
import { PostgresAuthRepository } from '#adapter/database/repository/auth'
import { PostgresBuildingRepository } from '#adapter/database/repository/building'
import { PostgresBuildingUpgradeQueueRepository } from '#adapter/database/repository/building-upgrade-queue'
import { PostgresTechnologyResearchQueueRepository } from '#adapter/database/repository/technology-research-queue'
import { PostgresCellRepository } from '#adapter/database/repository/cell'
import { PostgresCityRepository } from '#adapter/database/repository/city'
import { PostgresExplorationRepository } from '#adapter/database/repository/exploration'
import { PostgresMovementRepository } from '#adapter/database/repository/movement'
import { PostgresOutpostRepository } from '#adapter/database/repository/outpost'
import { PostgresPlayerRepository } from '#adapter/database/repository/player'
import { PostgresReportRepository } from '#adapter/database/repository/report'
import { PostgresResourceStockRepository } from '#adapter/database/repository/resource-stock'
import { PostgresTechnologyRepository } from '#adapter/database/repository/technology'
import { PostgresTroopRepository } from '#adapter/database/repository/troop'
import { PostgresBattleRepository } from '#adapter/database/repository/battle'
import { PostgresSystemPlayerMemoryRepository } from '#adapter/database/repository/system-player-memory'
import { SystemPlayerMemoryRepository } from '#app/port/repository/system-player-memory'
import { TroopRecruitQueueRepository } from '#app/port/repository/troop-recruit-queue'
import { PostgresTroopRecruitQueueRepository } from '#adapter/database/repository/troop-recruit-queue'
import { DefenseRepository } from '#app/port/repository/defense'
import { PostgresDefenseRepository } from '#adapter/database/repository/defense'
import { DefenseBuildQueueRepository } from '#app/port/repository/defense-build-queue'
import { PostgresDefenseBuildQueueRepository } from '#adapter/database/repository/defense-build-queue'
import { MailRepository } from '#app/port/repository/mail'
import { PostgresMailRepository } from '#adapter/database/repository/mail'
import { ChatMessageRepository } from '#app/port/repository/chat-message'
import { PostgresChatMessageRepository } from '#adapter/database/repository/chat-message'
import { PlayerBlockRepository } from '#app/port/repository/player-block'
import { PostgresPlayerBlockRepository } from '#adapter/database/repository/player-block'
import { AbuseReportRepository } from '#app/port/repository/abuse-report'
import { PostgresAbuseReportRepository } from '#adapter/database/repository/abuse-report'
import { AllianceRepository } from '#app/port/repository/alliance'
import { PostgresAllianceRepository } from '#adapter/database/repository/alliance'
import { RankingRepository } from '#app/port/repository/ranking'
import { PostgresRankingRepository } from '#adapter/database/repository/ranking'
import {
  Kysely,
  sql
} from 'kysely'

export class PostgresRepository implements Repository {
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

  private db: Kysely<DB>

  constructor(db?: Kysely<DB>) {
    if (db) {
      setRootDatabase(db)
    }
    this.db = getRootDatabase()
    this.auth = new PostgresAuthRepository(this.db)
    this.building = new PostgresBuildingRepository(this.db)
    this.building_upgrade_queue = new PostgresBuildingUpgradeQueueRepository(this.db)
    this.technology_research_queue = new PostgresTechnologyResearchQueueRepository(this.db)
    this.cell = new PostgresCellRepository(this.db)
    this.resource_stock = new PostgresResourceStockRepository(this.db)
    this.city = new PostgresCityRepository(this.db)
    this.exploration = new PostgresExplorationRepository(this.db)
    this.movement = new PostgresMovementRepository(this.db)
    this.outpost = new PostgresOutpostRepository(this.db)
    this.report = new PostgresReportRepository(this.db)
    this.player = new PostgresPlayerRepository(this.db)
    this.technology = new PostgresTechnologyRepository(this.db)
    this.troop = new PostgresTroopRepository(this.db)
    this.troop_recruit_queue = new PostgresTroopRecruitQueueRepository(this.db)
    this.defense = new PostgresDefenseRepository(this.db)
    this.defense_build_queue = new PostgresDefenseBuildQueueRepository(this.db)
    this.battle = new PostgresBattleRepository(this.db)
    this.system_player_memory = new PostgresSystemPlayerMemoryRepository(this.db)
    this.mail = new PostgresMailRepository(this.db)
    this.chat_message = new PostgresChatMessageRepository(this.db)
    this.player_block = new PostgresPlayerBlockRepository()
    this.abuse_report = new PostgresAbuseReportRepository()
    this.alliance = new PostgresAllianceRepository()
    this.ranking = new PostgresRankingRepository()
  }

  async connect(): Promise<void> {
    const logger = Factory.getLogger('adapter:repository')
    logger.info('connecting to postgres...')
    await sql`select 1`.execute(this.db)
    logger.info('connected to postgres')
  }
}
