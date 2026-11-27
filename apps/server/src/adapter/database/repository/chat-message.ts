import { ChatMessageEntity } from '#core/communication/chat/entity'
import { ChatMessageRepository } from '#app/port/repository/chat-message'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { isId } from '#shared/identification'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'

export class PostgresChatMessageRepository
  extends PostgreSQLGenericRepository<'chat_message', ChatMessageEntity>
  implements ChatMessageRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'chat_message', CommunicationError.CHAT_MESSAGE_NOT_FOUND)
  }

  async getById(id: string): Promise<ChatMessageEntity> {
    if (!isId(id)) {
      throw new Error(CommunicationError.CHAT_MESSAGE_NOT_FOUND)
    }
    return this.findByIdOrThrow(id)
  }

  async listHistory({
    channel_key,
    viewer_id,
    before,
    limit
  }: {
    channel_key: string
    viewer_id: string
    before?: string
    limit: number
  }): Promise<ChatMessageEntity[]> {
    if (before !== undefined && !isId(before)) {
      return []
    }

    let query = this.db
      .selectFrom('chat_message')
      .selectAll()
      .where('channel', '=', channel_key)
      .where('author_id', 'not in', eb => eb
        .selectFrom('player_block')
        .select('blocked_id')
        .where('blocker_id', '=', viewer_id))

    if (before) {
      // Row comparison on (created_at, id): stable order when two messages share a timestamp.
      query = query.where(eb => eb(
        eb.refTuple('created_at', 'id'),
        '<',
        eb.selectFrom('chat_message as cursor')
          .select([
            'cursor.created_at',
            'cursor.id'
          ])
          .where('cursor.id', '=', before)
          .where('cursor.channel', '=', channel_key)
          .$asTuple('created_at', 'id')
      ))
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async deleteOlderThan(before: number): Promise<number> {
    const result = await this.db
      .deleteFrom('chat_message')
      .where('created_at', '<', toTimestampRequired(before))
      .executeTakeFirst()

    return Number(result.numDeletedRows)
  }

  protected buildFromRow(row: Selectable<DB['chat_message']>): ChatMessageEntity {
    return ChatMessageEntity.create({
      id: row.id,
      channel: row.channel,
      author_id: row.author_id,
      body: row.body,
      created_at: fromTimestampRequired(row.created_at),
    })
  }

  protected toRow(entity: ChatMessageEntity): Insertable<DB['chat_message']> {
    return {
      id: entity.id,
      channel: entity.channel,
      author_id: entity.author_id,
      body: entity.body,
      created_at: toTimestampRequired(entity.created_at),
    }
  }
}
