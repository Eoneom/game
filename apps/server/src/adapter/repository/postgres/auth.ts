import { AuthEntity } from '#core/auth/entity'
import { AuthRepository } from '#app/port/repository/auth'
import { PostgreSQLGenericRepository } from '#adapter/repository/postgres/generic'
import { AuthError } from '#core/auth/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/repository/postgres/shared/time'

export class PostgresAuthRepository
  extends PostgreSQLGenericRepository<'auth', AuthEntity>
  implements AuthRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'auth', AuthError.NOT_FOUND)
  }

  async get(query: { token: string }): Promise<AuthEntity> {
    const row = await this.db
      .selectFrom('auth')
      .selectAll()
      .where('token', '=', query.token)
      .executeTakeFirst()

    if (!row) {
      throw new Error(AuthError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  protected buildFromRow(row: Selectable<DB['auth']>): AuthEntity {
    return AuthEntity.create({
      id: row.id,
      player_id: row.player_id,
      token: row.token,
      last_action_at: fromTimestampRequired(row.last_action_at)
    })
  }

  protected toRow(entity: AuthEntity): Insertable<DB['auth']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      token: entity.token,
      last_action_at: toTimestampRequired(entity.last_action_at)
    }
  }
}
