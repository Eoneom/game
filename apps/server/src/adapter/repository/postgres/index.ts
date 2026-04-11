import { Factory } from '#adapter/factory'
import { createDatabase } from '#adapter/database/client'
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
import { PostgresAuthRepository } from '#adapter/repository/postgres/auth'
import { PostgresBuildingRepository } from '#adapter/repository/postgres/building'
import { PostgresCellRepository } from '#adapter/repository/postgres/cell'
import { PostgresCityRepository } from '#adapter/repository/postgres/city'
import { PostgresExplorationRepository } from '#adapter/repository/postgres/exploration'
import { PostgresMovementRepository } from '#adapter/repository/postgres/movement'
import { PostgresOutpostRepository } from '#adapter/repository/postgres/outpost'
import { PostgresPlayerRepository } from '#adapter/repository/postgres/player'
import { PostgresReportRepository } from '#adapter/repository/postgres/report'
import { PostgresResourceStockRepository } from '#adapter/repository/postgres/resource-stock'
import { PostgresTechnologyRepository } from '#adapter/repository/postgres/technology'
import { PostgresTroopRepository } from '#adapter/repository/postgres/troop'
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
    this.db = db ?? createDatabase()
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
