import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { BuildingUpgradeQueueRepository } from '#app/port/repository/building-upgrade-queue'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingError } from '#core/building/error'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresBuildingUpgradeQueueRepository
  extends PostgreSQLGenericRepository<'building_upgrade_queue', BuildingUpgradeQueueEntity>
  implements BuildingUpgradeQueueRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'building_upgrade_queue', BuildingError.QUEUE_ITEM_NOT_FOUND)
  }

  async listByCity({ city_id }: { city_id: string }): Promise<BuildingUpgradeQueueEntity[]> {
    const rows = await this.db
      .selectFrom('building_upgrade_queue')
      .selectAll()
      .where('city_id', '=', city_id)
      .orderBy('created_at', 'asc')
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async countByCity({ city_id }: { city_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('building_upgrade_queue')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('city_id', '=', city_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getById(id: string): Promise<BuildingUpgradeQueueEntity> {
    return this.findByIdOrThrow(id)
  }

  protected buildFromRow(row: Selectable<DB['building_upgrade_queue']>): BuildingUpgradeQueueEntity {
    return BuildingUpgradeQueueEntity.create({
      id: row.id,
      city_id: row.city_id,
      building_code: row.building_code as BuildingCode,
      created_at: fromTimestampRequired(row.created_at)
    })
  }

  protected toRow(entity: BuildingUpgradeQueueEntity): Insertable<DB['building_upgrade_queue']> {
    return {
      id: entity.id,
      city_id: entity.city_id,
      building_code: entity.building_code,
      created_at: toTimestampRequired(entity.created_at)
    }
  }
}
