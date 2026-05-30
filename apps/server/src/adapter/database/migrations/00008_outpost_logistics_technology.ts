import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    INSERT INTO technology (player_id, code, level)
    SELECT p.id, 'outpost_logistics', 0
    FROM player p
    WHERE NOT EXISTS (
      SELECT 1
      FROM technology t
      WHERE t.player_id = p.id
        AND t.code = 'outpost_logistics'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM technology
    WHERE code = 'outpost_logistics'
  `.execute(db)
}
