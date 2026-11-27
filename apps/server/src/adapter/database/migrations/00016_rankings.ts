import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 034: cumulative military value per player and hourly ranking snapshots.
 * `ranking_entry.entity_id` is text: a player or alliance id, or a faction code.
 * `position` is the display order inside one (snapshot, category, kind): rank, then name.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('player')
    .addColumn('military_value', 'bigint', (col) => col.notNull().defaultTo(0))
    .execute()

  await db.schema
    .createTable('ranking_snapshot')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('computed_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('ranking_snapshot_computed_at_idx')
    .on('ranking_snapshot')
    .column('computed_at')
    .execute()

  await db.schema
    .createTable('ranking_entry')
    .addColumn('snapshot_id', 'uuid', (col) => col.notNull().references('ranking_snapshot.id').onDelete('cascade'))
    .addColumn('category', 'text', (col) => col.notNull())
    .addColumn('kind', 'text', (col) => col.notNull())
    .addColumn('entity_id', 'text', (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .addColumn('position', 'integer', (col) => col.notNull())
    .addColumn('points', 'bigint', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('ranking_entry_snapshot_category_kind_rank_idx')
    .on('ranking_entry')
    .columns([
      'snapshot_id',
      'category',
      'kind',
      'rank'
    ])
    .execute()

  await db.schema
    .createIndex('ranking_entry_entity_category_kind_idx')
    .on('ranking_entry')
    .columns([
      'entity_id',
      'category',
      'kind'
    ])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('ranking_entry').execute()
  await db.schema.dropTable('ranking_snapshot').execute()
  await db.schema.alterTable('player').dropColumn('military_value').execute()
}
