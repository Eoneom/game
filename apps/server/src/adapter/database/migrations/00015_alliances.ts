import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 033: alliances, members, invitations, applications, the leave cooldown and the
 * `reinforcement` report metadata.
 * `report.type` and `report_battle.perspective` are free text (no check constraint), so the new
 * `reinforcement` report type and battle perspective need no schema change.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('alliance')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('name_normalized', 'text', (col) => col.notNull().unique())
    .addColumn('tag', 'text', (col) => col.notNull().unique())
    .addColumn('description', 'text', (col) => col.notNull().defaultTo(''))
    .addColumn('faction_code', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('alliance_member')
    .addColumn('alliance_id', 'uuid', (col) => col.notNull().references('alliance.id').onDelete('cascade'))
    .addColumn('player_id', 'uuid', (col) => col.notNull().unique().references('player.id').onDelete('cascade'))
    .addColumn('role', 'text', (col) => col.notNull())
    .addColumn('joined_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('alliance_member_alliance_id_idx')
    .on('alliance_member')
    .column('alliance_id')
    .execute()

  await db.schema
    .createTable('alliance_invitation')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('alliance_id', 'uuid', (col) => col.notNull().references('alliance.id').onDelete('cascade'))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('invited_by', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('alliance_invitation_player_id_idx')
    .on('alliance_invitation')
    .column('player_id')
    .execute()

  await db.schema
    .createTable('alliance_application')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('alliance_id', 'uuid', (col) => col.notNull().references('alliance.id').onDelete('cascade'))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('message', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addUniqueConstraint('alliance_application_alliance_id_player_id_unique', [
      'alliance_id',
      'player_id'
    ])
    .execute()

  await db.schema
    .createIndex('alliance_application_player_id_idx')
    .on('alliance_application')
    .column('player_id')
    .execute()

  await db.schema
    .alterTable('player')
    .addColumn('alliance_left_at', 'timestamptz')
    .execute()

  // Arrival notice to the host: who stationed the troops (stored like `report_spy`).
  await db.schema
    .createTable('report_reinforcement')
    .addColumn('report_id', 'uuid', (col) => col.primaryKey().references('report.id').onDelete('cascade'))
    .addColumn('owner_player_id', 'uuid', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('report_reinforcement').execute()
  await db.schema.alterTable('player').dropColumn('alliance_left_at').execute()
  await db.schema.dropTable('alliance_application').execute()
  await db.schema.dropTable('alliance_invitation').execute()
  await db.schema.dropTable('alliance_member').execute()
  await db.schema.dropTable('alliance').execute()
}
