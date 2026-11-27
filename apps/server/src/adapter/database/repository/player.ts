import { PlayerEntity } from '#core/player/entity'
import { PlayerRepository } from '#app/port/repository/player'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerError } from '#core/player/error'
import type { DB } from '#adapter/database/types'
import {
  fromTimestamp,
  toTimestamp
} from '#adapter/database/repository/shared/time'
import {
  Insertable,
  Kysely,
  Selectable,
  sql
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

  async listByIds(ids: string[]): Promise<PlayerEntity[]> {
    if (ids.length === 0) {
      return []
    }
    const rows = await this.db
      .selectFrom('player')
      .selectAll()
      .where('id', 'in', ids)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async listSystemControlled(): Promise<PlayerEntity[]> {
    const rows = await this.db
      .selectFrom('player')
      .selectAll()
      .where('system_controlled', '=', true)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async searchHumansByNamePrefix({
    prefix,
    limit
  }: {
    prefix: string
    limit: number
  }): Promise<PlayerEntity[]> {
    const escaped = prefix.replace(/[\\%_]/g, char => `\\${char}`)
    const rows = await this.db
      .selectFrom('player')
      .selectAll()
      .where('system_controlled', '=', false)
      .where('name', 'ilike', `${escaped}%`)
      .orderBy('name', 'asc')
      .limit(limit)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async setAllianceLeftAt({
    player_id,
    left_at
  }: {
    player_id: string
    left_at: number | null
  }): Promise<void> {
    await this.db
      .updateTable('player')
      .set({ alliance_left_at: toTimestamp(left_at) })
      .where('id', '=', player_id)
      .execute()
  }

  async addMilitaryValue({
    player_id,
    value
  }: {
    player_id: string
    value: number
  }): Promise<void> {
    const amount = Math.floor(value)
    if (!Number.isFinite(amount) || amount <= 0) {
      return
    }
    await this.db
      .updateTable('player')
      .set({ military_value: sql<string>`military_value + ${String(amount)}::bigint` })
      .where('id', '=', player_id)
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['player']>): PlayerEntity {
    return PlayerEntity.create({
      id: row.id,
      name: row.name,
      faction_code: row.faction_code as FactionCode,
      system_controlled: row.system_controlled,
      alliance_left_at: fromTimestamp(row.alliance_left_at ?? null)
    })
  }

  protected toRow(entity: PlayerEntity): Insertable<DB['player']> {
    return {
      id: entity.id,
      name: entity.name,
      faction_code: entity.faction_code,
      system_controlled: entity.system_controlled,
      alliance_left_at: toTimestamp(entity.alliance_left_at)
    }
  }
}
