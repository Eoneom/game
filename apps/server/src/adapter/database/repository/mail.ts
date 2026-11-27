import { MailEntity } from '#core/communication/mail/entity'
import {
  MailBox,
  MailRepository
} from '#app/port/repository/mail'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { isId } from '#shared/identification'
import type { DB } from '#adapter/database/types'
import {
  ExpressionBuilder,
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestamp,
  fromTimestampRequired,
  toTimestamp,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'

const boxFilter = (player_id: string, box: MailBox) => (eb: ExpressionBuilder<DB, 'mail'>) => {
  return box === 'inbox'
    ? eb.and([
      eb('recipient_id', '=', player_id),
      eb('delivered', '=', true),
      eb('deleted_by_recipient', '=', false),
    ])
    : eb.and([
      eb('sender_id', '=', player_id),
      eb('deleted_by_sender', '=', false),
    ])
}

export class PostgresMailRepository
  extends PostgreSQLGenericRepository<'mail', MailEntity>
  implements MailRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'mail', CommunicationError.MAIL_NOT_FOUND)
  }

  async getById(id: string): Promise<MailEntity> {
    if (!isId(id)) {
      throw new Error(CommunicationError.MAIL_NOT_FOUND)
    }
    return this.findByIdOrThrow(id)
  }

  async list({
    player_id,
    box,
    limit,
    offset
  }: {
    player_id: string
    box: MailBox
    limit: number
    offset: number
  }): Promise<{ mails: MailEntity[]; total: number }> {
    const [
      rows,
      total_result
    ] = await Promise.all([
      this.db
        .selectFrom('mail')
        .selectAll()
        .where(boxFilter(player_id, box))
        .orderBy('sent_at', 'desc')
        .orderBy('id', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      this.db
        .selectFrom('mail')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where(boxFilter(player_id, box))
        .executeTakeFirstOrThrow()
    ])

    return {
      mails: rows.map(row => this.buildFromRow(row)),
      total: Number(total_result.count)
    }
  }

  async countUnread(player_id: string): Promise<number> {
    const result = await this.db
      .selectFrom('mail')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where(boxFilter(player_id, 'inbox'))
      .where('read_at', 'is', null)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async deleteDeletedByBoth(): Promise<number> {
    const result = await this.db
      .deleteFrom('mail')
      .where('deleted_by_sender', '=', true)
      .where(eb => eb.or([
        eb('deleted_by_recipient', '=', true),
        eb('delivered', '=', false),
      ]))
      .executeTakeFirst()

    return Number(result.numDeletedRows)
  }

  protected buildFromRow(row: Selectable<DB['mail']>): MailEntity {
    return MailEntity.create({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      subject: row.subject,
      body: row.body,
      in_reply_to: row.in_reply_to,
      delivered: row.delivered,
      sent_at: fromTimestampRequired(row.sent_at),
      read_at: fromTimestamp(row.read_at),
      deleted_by_sender: row.deleted_by_sender,
      deleted_by_recipient: row.deleted_by_recipient,
    })
  }

  protected toRow(entity: MailEntity): Insertable<DB['mail']> {
    return {
      id: entity.id,
      sender_id: entity.sender_id,
      recipient_id: entity.recipient_id,
      subject: entity.subject,
      body: entity.body,
      in_reply_to: entity.in_reply_to,
      delivered: entity.delivered,
      sent_at: toTimestampRequired(entity.sent_at),
      read_at: toTimestamp(entity.read_at),
      deleted_by_sender: entity.deleted_by_sender,
      deleted_by_recipient: entity.deleted_by_recipient,
    }
  }
}
