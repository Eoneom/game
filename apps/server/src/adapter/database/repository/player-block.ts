import {
  PlayerBlockEntry,
  PlayerBlockRepository
} from '#app/port/repository/player-block'
import { getDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import { Kysely } from 'kysely'
import { isId } from '#shared/identification'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'

export class PostgresPlayerBlockRepository implements PlayerBlockRepository {
  private get db(): Kysely<DB> {
    return getDatabase()
  }

  async block({
    blocker_id,
    blocked_id,
    created_at
  }: {
    blocker_id: string
    blocked_id: string
    created_at: number
  }): Promise<void> {
    await this.db
      .insertInto('player_block')
      .values({
        blocker_id,
        blocked_id,
        created_at: toTimestampRequired(created_at),
      })
      .onConflict(oc => oc.columns([
        'blocker_id',
        'blocked_id'
      ]).doNothing())
      .execute()
  }

  async unblock({
    blocker_id,
    blocked_id
  }: {
    blocker_id: string
    blocked_id: string
  }): Promise<void> {
    if (!isId(blocked_id)) {
      return
    }
    await this.db
      .deleteFrom('player_block')
      .where('blocker_id', '=', blocker_id)
      .where('blocked_id', '=', blocked_id)
      .execute()
  }

  async isBlocked({
    blocker_id,
    blocked_id
  }: {
    blocker_id: string
    blocked_id: string
  }): Promise<boolean> {
    const row = await this.db
      .selectFrom('player_block')
      .select('blocker_id')
      .where('blocker_id', '=', blocker_id)
      .where('blocked_id', '=', blocked_id)
      .executeTakeFirst()

    return Boolean(row)
  }

  async listBlocked(blocker_id: string): Promise<PlayerBlockEntry[]> {
    const rows = await this.db
      .selectFrom('player_block')
      .select([
        'blocked_id',
        'created_at'
      ])
      .where('blocker_id', '=', blocker_id)
      .orderBy('created_at', 'desc')
      .execute()

    return rows.map(row => ({
      blocked_id: row.blocked_id,
      created_at: fromTimestampRequired(row.created_at),
    }))
  }

  async listBlockerIds(blocked_id: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('player_block')
      .select('blocker_id')
      .where('blocked_id', '=', blocked_id)
      .execute()

    return rows.map(row => row.blocker_id)
  }
}
