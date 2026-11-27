import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 039: Confederation identity. Every city gets a `defense` row at count 0 for the two faction defenses (00012
 * created one row per city and code), and round summaries record the losses absorbed by holo decoys and whether the
 * railguns fired doubled.
 */
const CONFEDERATION_DEFENSE_CODES = [
  'railgun',
  'holo_decoy',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('battle_round')
    .addColumn('decoy_absorbed', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('railgun_doubled', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute()

  for (const code of CONFEDERATION_DEFENSE_CODES) {
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
    .dropColumn('decoy_absorbed')
    .dropColumn('railgun_doubled')
    .execute()

  await sql`
    DELETE FROM defense
    WHERE code IN ('railgun', 'holo_decoy') AND count = 0
  `.execute(db)
}
