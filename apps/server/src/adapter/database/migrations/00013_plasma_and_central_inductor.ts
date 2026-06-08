import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('resource_stock')
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('resource_stock')
    .addColumn('last_plasma_gather', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .alterTable('movement')
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('remaining_plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await sql`
    INSERT INTO building (id, city_id, code, level)
    SELECT gen_random_uuid(), c.id, 'central_inductor', 0
    FROM city c
    WHERE NOT EXISTS (
      SELECT 1
      FROM building b
      WHERE b.city_id = c.id
        AND b.code = 'central_inductor'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM building
    WHERE code = 'central_inductor'
  `.execute(db)

  await db.schema
    .alterTable('report')
    .dropColumn('remaining_plasma')
    .execute()

  await db.schema
    .alterTable('report')
    .dropColumn('plasma')
    .execute()

  await db.schema
    .alterTable('movement')
    .dropColumn('plasma')
    .execute()

  await db.schema
    .alterTable('resource_stock')
    .dropColumn('last_plasma_gather')
    .execute()

  await db.schema
    .alterTable('resource_stock')
    .dropColumn('plasma')
    .execute()
}
