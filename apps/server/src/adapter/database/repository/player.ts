import { PlayerEntity } from '#core/player/entity'
import { PlayerRepository } from '#app/port/repository/player'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerError } from '#core/player/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresPlayerRepository
  extends PostgreSQLGenericRepository<'player', PlayerEntity>
  implements PlayerRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'player', PlayerError.NOT_FOUND)
  }

  get(id: string): Promise<PlayerEntity> {
    return this.findByIdOrThrow(id)
  }

  async exist(name: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('player')
      .select('id')
      .where('name', '=', name)
      .executeTakeFirst()

    return Boolean(row)
  }

  async getByName(name: string): Promise<PlayerEntity> {
    const row = await this.db
      .selectFrom('player')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst()

    if (!row) {
      throw new Error(PlayerError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  protected buildFromRow(row: Selectable<DB['player']>): PlayerEntity {
    return PlayerEntity.create({
      id: row.id,
      name: row.name,
      faction_code: row.faction_code as FactionCode
    })
  }

  protected toRow(entity: PlayerEntity): Insertable<DB['player']> {
    return {
      id: entity.id,
      name: entity.name,
      faction_code: entity.faction_code
    }
  }
}
