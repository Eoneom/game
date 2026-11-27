import { DefenseEntity } from '#core/defense/entity'
import { DefenseRepository } from '#app/port/repository/defense'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable,
  sql
} from 'kysely'

export class PostgresDefenseRepository
  extends PostgreSQLGenericRepository<'defense', DefenseEntity>
  implements DefenseRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'defense', DefenseError.NOT_FOUND)
  }

  async listByCity({ city_id }: { city_id: string }): Promise<DefenseEntity[]> {
    const rows = await this.db
      .selectFrom('defense')
      .selectAll()
      .where('city_id', '=', city_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async addCount({
    player_id,
    city_id,
    code,
    count
  }: { player_id: string, city_id: string, code: DefenseCode, count: number }): Promise<void> {
    await this.db
      .insertInto('defense')
      .values({
        player_id,
        city_id,
        code,
        count
      })
      .onConflict(oc => oc
        .columns([
          'city_id',
          'code'
        ])
        .doUpdateSet({
          player_id,
          count: sql<number>`defense.count + excluded.count`
        }))
      .execute()
  }

  async removeCount({
    city_id,
    code,
    count
  }: { city_id: string, code: DefenseCode, count: number }): Promise<void> {
    await this.db
      .updateTable('defense')
      .set({ count: sql<number>`GREATEST(0, count - ${count})` })
      .where('city_id', '=', city_id)
      .where('code', '=', code)
      .execute()
  }

  async deleteByCity({ city_id }: { city_id: string }): Promise<void> {
    await this.db
      .deleteFrom('defense')
      .where('city_id', '=', city_id)
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['defense']>): DefenseEntity {
    return DefenseEntity.create({
      id: row.id,
      player_id: row.player_id,
      city_id: row.city_id,
      code: row.code as DefenseCode,
      count: row.count
    })
  }

  protected toRow(entity: DefenseEntity): Insertable<DB['defense']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      city_id: entity.city_id,
      code: entity.code,
      count: entity.count
    }
  }
}
