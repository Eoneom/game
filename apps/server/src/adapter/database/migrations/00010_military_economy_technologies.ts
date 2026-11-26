import {
  Kysely, sql
} from 'kysely'

/** Slice 027: Arsenal and Économie technology codes, backfilled at level 0 for existing players. */
const MILITARY_ECONOMY_TECHNOLOGY_CODES = [
  'ballistic_alloys',
  'organic_plating',
  'tactical_propulsion',
  'advanced_recycling',
  'agronomy',
  'storage_compression',
  'plasma_containment',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const code of MILITARY_ECONOMY_TECHNOLOGY_CODES) {
    await sql`
      INSERT INTO technology (player_id, code, level)
      SELECT p.id, ${code}, 0
      FROM player p
      WHERE NOT EXISTS (
        SELECT 1 FROM technology t
        WHERE t.player_id = p.id AND t.code = ${code}
      )
    `.execute(db)
  }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Data backfill only; rows may be researched after deploy.
}
