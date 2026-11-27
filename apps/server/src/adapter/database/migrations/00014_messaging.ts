import {
  Kysely, sql
} from 'kysely'

/** Slice 032: letters, chat messages, player blocks and abuse reports. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('mail')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('sender_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('recipient_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('subject', 'text', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    // The replied letter may be purged by the cleanup job.
    .addColumn('in_reply_to', 'uuid', (col) => col.references('mail.id').onDelete('set null'))
    .addColumn('delivered', 'boolean', (col) => col.notNull())
    .addColumn('sent_at', 'timestamptz', (col) => col.notNull())
    .addColumn('read_at', 'timestamptz')
    .addColumn('deleted_by_sender', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('deleted_by_recipient', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute()

  await db.schema
    .createIndex('mail_recipient_id_sent_at_idx')
    .on('mail')
    .columns([
      'recipient_id',
      'sent_at'
    ])
    .execute()

  await db.schema
    .createIndex('mail_sender_id_sent_at_idx')
    .on('mail')
    .columns([
      'sender_id',
      'sent_at'
    ])
    .execute()

  await db.schema
    .createTable('chat_message')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    // `global` or `faction:<faction_code>`.
    .addColumn('channel', 'text', (col) => col.notNull())
    .addColumn('author_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('chat_message_channel_created_at_idx')
    .on('chat_message')
    .columns([
      'channel',
      'created_at'
    ])
    .execute()

  await db.schema
    .createTable('player_block')
    .addColumn('blocker_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('blocked_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addPrimaryKeyConstraint('player_block_pkey', [
      'blocker_id',
      'blocked_id'
    ])
    .execute()

  // `message_id` has no foreign key: `content` is a snapshot that outlives chat cleanup and mail purge.
  await db.schema
    .createTable('abuse_report')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('reporter_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('author_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('kind', 'text', (col) => col.notNull())
    .addColumn('message_id', 'uuid', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('reason', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addUniqueConstraint('abuse_report_reporter_id_kind_message_id_unique', [
      'reporter_id',
      'kind',
      'message_id'
    ])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('abuse_report').execute()
  await db.schema.dropTable('player_block').execute()
  await db.schema.dropTable('chat_message').execute()
  await db.schema.dropTable('mail').execute()
}
