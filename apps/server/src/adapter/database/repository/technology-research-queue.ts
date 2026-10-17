import { TechnologyResearchQueueEntity } from '#core/technology/research-queue-entity'
import { TechnologyResearchQueueRepository } from '#app/port/repository/technology-research-queue'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyError } from '#core/technology/error'
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

export class PostgresTechnologyResearchQueueRepository
  extends PostgreSQLGenericRepository<'technology_research_queue', TechnologyResearchQueueEntity>
  implements TechnologyResearchQueueRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'technology_research_queue', TechnologyError.QUEUE_ITEM_NOT_FOUND)
  }

  async listByPlayer({ player_id }: { player_id: string }): Promise<TechnologyResearchQueueEntity[]> {
    const rows = await this.db
      .selectFrom('technology_research_queue')
      .selectAll()
      .where('player_id', '=', player_id)
      .orderBy('created_at', 'asc')
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async countByPlayer({ player_id }: { player_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('technology_research_queue')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getById(id: string): Promise<TechnologyResearchQueueEntity> {
    return this.findByIdOrThrow(id)
  }

  protected buildFromRow(row: Selectable<DB['technology_research_queue']>): TechnologyResearchQueueEntity {
    return TechnologyResearchQueueEntity.create({
      id: row.id,
      player_id: row.player_id,
      city_id: row.city_id,
      technology_code: row.technology_code as TechnologyCode,
      created_at: fromTimestampRequired(row.created_at)
    })
  }

  protected toRow(entity: TechnologyResearchQueueEntity): Insertable<DB['technology_research_queue']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      city_id: entity.city_id,
      technology_code: entity.technology_code,
      created_at: toTimestampRequired(entity.created_at)
    }
  }
}
