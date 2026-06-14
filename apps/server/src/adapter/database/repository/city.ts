import { CityEntity } from '#core/city/entity'
import { CityRepository } from '#app/port/repository/city'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { CityError } from '#core/city/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresCityRepository
  extends PostgreSQLGenericRepository<'city', CityEntity>
  implements CityRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'city', CityError.NOT_FOUND)
  }

  async count({ player_id }: { player_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('city')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async get(id: string): Promise<CityEntity> {
    return this.findByIdOrThrow(id)
  }

  async list({ player_id }: { player_id: string }): Promise<CityEntity[]> {
    const rows = await this.db
      .selectFrom('city')
      .selectAll()
      .where('player_id', '=', player_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async listAll(): Promise<CityEntity[]> {
    const rows = await this.db
      .selectFrom('city')
      .selectAll()
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async exist(name: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('city')
      .select('id')
      .where('name', '=', name)
      .executeTakeFirst()

    return Boolean(row)
  }

  async searchByCell({ cell_id }: { cell_id: string }): Promise<CityEntity | null> {
    const row = await this.db
      .selectFrom('city')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    if (!row) {
      return null
    }

    return this.buildFromRow(row)
  }

  protected buildFromRow(row: Selectable<DB['city']>): CityEntity {
    return CityEntity.create({
      id: row.id,
      player_id: row.player_id,
      name: row.name,
      cell_id: row.cell_id
    })
  }

  protected toRow(entity: CityEntity): Insertable<DB['city']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      name: entity.name,
      cell_id: entity.cell_id
    }
  }
}
