import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import { TroopRecruitQueueRepository } from '#app/port/repository/troop-recruit-queue'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
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

export class PostgresTroopRecruitQueueRepository
  extends PostgreSQLGenericRepository<'troop_recruit_queue', TroopRecruitQueueEntity>
  implements TroopRecruitQueueRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'troop_recruit_queue', TroopError.QUEUE_ITEM_NOT_FOUND)
  }

  async listByCity({ city_id }: { city_id: string }): Promise<TroopRecruitQueueEntity[]> {
    const rows = await this.db
      .selectFrom('troop_recruit_queue')
      .selectAll()
      .where('city_id', '=', city_id)
      .orderBy('created_at', 'asc')
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async countByCity({ city_id }: { city_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('troop_recruit_queue')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('city_id', '=', city_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getById(id: string): Promise<TroopRecruitQueueEntity> {
    return this.findByIdOrThrow(id)
  }

  async deleteByCity({ city_id }: { city_id: string }): Promise<void> {
    await this.db
      .deleteFrom('troop_recruit_queue')
      .where('city_id', '=', city_id)
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['troop_recruit_queue']>): TroopRecruitQueueEntity {
    return TroopRecruitQueueEntity.create({
      id: row.id,
      player_id: row.player_id,
      city_id: row.city_id,
      troop_code: row.troop_code as TroopCode,
      count: row.count,
      created_at: fromTimestampRequired(row.created_at)
    })
  }

  protected toRow(entity: TroopRecruitQueueEntity): Insertable<DB['troop_recruit_queue']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      city_id: entity.city_id,
      troop_code: entity.troop_code,
      count: entity.count,
      created_at: toTimestampRequired(entity.created_at)
    }
  }
}
