import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    INSERT INTO building (id, city_id, code, level)
    SELECT gen_random_uuid(), c.id, 'solar_panel', 0
    FROM city c
    WHERE NOT EXISTS (
      SELECT 1
      FROM building b
      WHERE b.city_id = c.id
        AND b.code = 'solar_panel'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM building
    WHERE code = 'solar_panel'
  `.execute(db)
}
