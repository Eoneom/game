import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('building_upgrade_queue')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('building_code', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('building_upgrade_queue_city_id_created_at_idx')
    .on('building_upgrade_queue')
    .columns(['city_id', 'created_at'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable('building_upgrade_queue')
    .execute()
}
