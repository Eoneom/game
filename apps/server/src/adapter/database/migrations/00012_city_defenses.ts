import {
  Kysely, sql
} from 'kysely'

/** Slice 029: city defenses, fortification queue, Enceinte and Fortification backfills. */
const DEFENSE_CODES = [
  'rampart',
  'turret',
  'minefield',
  'plasma_battery',
  'shield_generator',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('defense')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull().defaultTo(0))
    .addUniqueConstraint('defense_city_id_code_unique', [
      'city_id',
      'code'
    ])
    .execute()

  await db.schema
    .createTable('defense_build_queue')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('defense_code', 'text', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('defense_build_queue_city_id_created_at_idx')
    .on('defense_build_queue')
    .columns([
      'city_id',
      'created_at'
    ])
    .execute()

  // Round summaries record what batteries spent and what shields absorbed.
  await db.schema
    .alterTable('battle_round')
    .addColumn('defender_plasma_spent', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('shield_reduction', 'double precision', (col) => col.notNull().defaultTo(0))
    .execute()

  await sql`
    INSERT INTO building (city_id, code, level)
    SELECT c.id, 'city_wall', 0
    FROM city c
    WHERE NOT EXISTS (
      SELECT 1 FROM building b
      WHERE b.city_id = c.id AND b.code = 'city_wall'
    )
  `.execute(db)

  for (const code of DEFENSE_CODES) {
    await sql`
      INSERT INTO defense (player_id, city_id, code, count)
      SELECT c.player_id, c.id, ${code}, 0
      FROM city c
      WHERE NOT EXISTS (
        SELECT 1 FROM defense d
        WHERE d.city_id = c.id AND d.code = ${code}
      )
    `.execute(db)
  }

  await sql`
    INSERT INTO technology (player_id, code, level)
    SELECT p.id, 'fortification', 0
    FROM player p
    WHERE NOT EXISTS (
      SELECT 1 FROM technology t
      WHERE t.player_id = p.id AND t.code = 'fortification'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('battle_round')
    .dropColumn('defender_plasma_spent')
    .dropColumn('shield_reduction')
    .execute()

  await db.schema.dropTable('defense_build_queue').execute()
  await db.schema.dropTable('defense').execute()
  // Building and technology rows are a data backfill; they may be upgraded after deploy.
}
