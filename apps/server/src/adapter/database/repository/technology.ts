import { TechnologyEntity } from '#core/technology/entity'
import { TechnologyRepository } from '#app/port/repository/technology'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyError } from '#core/technology/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresTechnologyRepository
  extends PostgreSQLGenericRepository<'technology', TechnologyEntity>
  implements TechnologyRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'technology', TechnologyError.NOT_FOUND)
  }

  async list({
    player_id,
    codes
  }: {
    player_id: string
    codes?: TechnologyCode[]
  }): Promise<TechnologyEntity[]> {
    let query = this.db
      .selectFrom('technology')
      .selectAll()
      .where('player_id', '=', player_id)

    if (codes && codes.length > 0) {
      query = query.where('code', 'in', codes)
    }

    const rows = await query.execute()
    return rows.map(row => this.buildFromRow(row))
  }

  async get(query: { player_id: string; code: TechnologyCode }): Promise<TechnologyEntity> {
    const row = await this.db
      .selectFrom('technology')
      .selectAll()
      .where('player_id', '=', query.player_id)
      .where('code', '=', query.code)
      .executeTakeFirst()

    if (!row) {
      throw new Error(TechnologyError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async getById(id: string): Promise<TechnologyEntity> {
    return this.findByIdOrThrow(id)
  }

  async getLevel({
    player_id,
    code
  }: { player_id: string; code: TechnologyCode }): Promise<number> {
    const row = await this.db
      .selectFrom('technology')
      .select('level')
      .where('player_id', '=', player_id)
      .where('code', '=', code)
      .executeTakeFirst()

    if (!row) {
      throw new Error(TechnologyError.NOT_FOUND)
    }

    return row.level
  }

  protected buildFromRow(row: Selectable<DB['technology']>): TechnologyEntity {
    return TechnologyEntity.create({
      id: row.id,
      player_id: row.player_id,
      code: row.code as TechnologyCode,
      level: row.level,
    })
  }

  protected toRow(entity: TechnologyEntity): Insertable<DB['technology']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      code: entity.code,
      level: entity.level,
    }
  }
}
