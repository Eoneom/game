import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('system_player_memory')
    .addColumn('player_id', 'uuid', (col) => col.primaryKey().references('player.id').onDelete('cascade'))
    .addColumn('memory_json', 'jsonb', (col) => col.notNull().defaultTo(sql`'{"failed_base_cells":[],"failed_attack_targets":[]}'::jsonb`))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_player_memory').execute()
}
