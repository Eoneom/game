import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('technology_research_queue')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('technology_code', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('technology_research_queue_player_id_created_at_idx')
    .on('technology_research_queue')
    .columns([
      'player_id',
      'created_at'
    ])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('technology_research_queue').execute()
}
