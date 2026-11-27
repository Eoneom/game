import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 036: La Symbiose. Every city gets a `defense` row at count 0 for the two faction defenses (00012 created
 * one row per city and code), and round summaries record the attack share absorbed by spore clouds.
 */
const SYMBIOSIS_DEFENSE_CODES = [
  'mycelium_wall',
  'spore_cloud',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('battle_round')
    .addColumn('spore_reduction', 'double precision', (col) => col.notNull().defaultTo(0))
    .execute()

  for (const code of SYMBIOSIS_DEFENSE_CODES) {
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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('battle_round')
    .dropColumn('spore_reduction')
    .execute()

  await sql`
    DELETE FROM defense
    WHERE code IN ('mycelium_wall', 'spore_cloud') AND count = 0
  `.execute(db)
}
