import {
  Kysely, sql
} from 'kysely'

/** Slice 028: command center and underground shelter, backfilled at level 0 for existing cities. */
const COMMAND_CENTER_SHELTER_BUILDING_CODES = [
  'command_center',
  'underground_shelter',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const code of COMMAND_CENTER_SHELTER_BUILDING_CODES) {
    await sql`
      INSERT INTO building (city_id, code, level)
      SELECT c.id, ${code}, 0
      FROM city c
      WHERE NOT EXISTS (
        SELECT 1 FROM building b
        WHERE b.city_id = c.id AND b.code = ${code}
      )
    `.execute(db)
  }

  await db.schema
    .createTable('troop_recruit_queue')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('troop_code', 'text', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('troop_recruit_queue_city_id_created_at_idx')
    .on('troop_recruit_queue')
    .columns([
      'city_id',
      'created_at'
    ])
    .execute()

  // Defender battle reports record what the shelter protected from loot.
  await db.schema
    .alterTable('report_battle')
    .addColumn('sheltered_json', 'jsonb', (col) => col
      .notNull()
      .defaultTo(sql`'{"plastic":0,"mushroom":0,"plasma":0}'::jsonb`))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('report_battle')
    .dropColumn('sheltered_json')
    .execute()

  await db.schema.dropTable('troop_recruit_queue').execute()
  // Building rows are a data backfill; they may be upgraded after deploy.
}
