import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    INSERT INTO technology (player_id, code, level)
    SELECT p.id, 'outpost_expansion', 0
    FROM player p
    WHERE NOT EXISTS (
      SELECT 1 FROM technology t
      WHERE t.player_id = p.id AND t.code = 'outpost_expansion'
    )
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Data backfill only; rows may be researched after deploy.
}
