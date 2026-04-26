import { Factory } from '#adapter/factory'
import {
  getRootDatabase,
  setRootDatabase
} from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import { Repository } from '#app/port/repository/generic'
import { AuthRepository } from '#app/port/repository/auth'
import { BuildingRepository } from '#app/port/repository/building'
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
import {
  Kysely,
  sql
} from 'kysely'

export class PostgresRepository implements Repository {
  auth: AuthRepository
  building: BuildingRepository
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

  private db: Kysely<DB>

  constructor(db?: Kysely<DB>) {
    if (db) {
      setRootDatabase(db)
    }
    this.db = getRootDatabase()
    this.auth = new PostgresAuthRepository(this.db)
    this.building = new PostgresBuildingRepository(this.db)
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
  }

  async connect(): Promise<void> {
    const logger = Factory.getLogger('adapter:repository')
    logger.info('connecting to postgres...')
    await sql`select 1`.execute(this.db)
    logger.info('connected to postgres')
  }
}
