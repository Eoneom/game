import { ResourceStockRepository } from '#app/port/repository/resource-stock'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { ResourceStockError } from '#core/resources/resource-stock/error'
import { now } from '#shared/time'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'

export class PostgresResourceStockRepository
  extends PostgreSQLGenericRepository<'resource_stock', ResourceStockEntity>
  implements ResourceStockRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'resource_stock', ResourceStockError.NOT_FOUND)
  }

  async getByCellId({ cell_id }: { cell_id: string }): Promise<ResourceStockEntity> {
    const row = await this.db
      .selectFrom('resource_stock')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    if (!row) {
      throw new Error(ResourceStockError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async ensureWorldStockForCell({ cell_id }: { cell_id: string }): Promise<void> {
    const existing = await this.db
      .selectFrom('resource_stock')
      .select('id')
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    if (existing) {
      return
    }

    const stock = ResourceStockEntity.initForWorldCell({
      cell_id,
      gather_at: now()
    })
    const without_id = { ...this.toRow(stock) }
    delete without_id.id

    await this.db
      .insertInto('resource_stock')
      .values(without_id)
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['resource_stock']>): ResourceStockEntity {
    return ResourceStockEntity.create({
      id: row.id,
      cell_id: row.cell_id,
      plastic: row.plastic,
      mushroom: row.mushroom,
      last_plastic_gather: fromTimestampRequired(row.last_plastic_gather),
      last_mushroom_gather: fromTimestampRequired(row.last_mushroom_gather)
    })
  }

  protected toRow(entity: ResourceStockEntity): Insertable<DB['resource_stock']> {
    return {
      id: entity.id,
      cell_id: entity.cell_id,
      plastic: entity.plastic,
      mushroom: entity.mushroom,
      last_plastic_gather: toTimestampRequired(entity.last_plastic_gather),
      last_mushroom_gather: toTimestampRequired(entity.last_mushroom_gather)
    }
  }
}
