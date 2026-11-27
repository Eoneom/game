import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseBuildQueueRepository } from '#app/port/repository/defense-build-queue'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
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

export class PostgresDefenseBuildQueueRepository
  extends PostgreSQLGenericRepository<'defense_build_queue', DefenseBuildQueueEntity>
  implements DefenseBuildQueueRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'defense_build_queue', DefenseError.QUEUE_ITEM_NOT_FOUND)
  }

  async listByCity({ city_id }: { city_id: string }): Promise<DefenseBuildQueueEntity[]> {
    const rows = await this.db
      .selectFrom('defense_build_queue')
      .selectAll()
      .where('city_id', '=', city_id)
      .orderBy('created_at', 'asc')
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async countByCity({ city_id }: { city_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('defense_build_queue')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('city_id', '=', city_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getById(id: string): Promise<DefenseBuildQueueEntity> {
    return this.findByIdOrThrow(id)
  }

  async deleteByCity({ city_id }: { city_id: string }): Promise<void> {
    await this.db
      .deleteFrom('defense_build_queue')
      .where('city_id', '=', city_id)
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['defense_build_queue']>): DefenseBuildQueueEntity {
    return DefenseBuildQueueEntity.create({
      id: row.id,
      player_id: row.player_id,
      city_id: row.city_id,
      defense_code: row.defense_code as DefenseCode,
      count: row.count,
      created_at: fromTimestampRequired(row.created_at)
    })
  }

  protected toRow(entity: DefenseBuildQueueEntity): Insertable<DB['defense_build_queue']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      city_id: entity.city_id,
      defense_code: entity.defense_code,
      count: entity.count,
      created_at: toTimestampRequired(entity.created_at)
    }
  }
}
