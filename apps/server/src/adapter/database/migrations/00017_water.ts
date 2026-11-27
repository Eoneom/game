import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 035 (part 1): water, a fourth resource (currency), the water purifier and the trading post.
 * Water columns mirror plasma: stock, last gather time, movement cargo and report amounts.
 * Building rows are backfilled at level 0 for existing cities.
 */
const WATER_BUILDING_CODES = [
  'water_purifier',
  'trading_post',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('resource_stock')
    .addColumn('water', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('last_water_gather', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .alterTable('movement')
    .addColumn('water', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('water', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('remaining_water', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  for (const code of WATER_BUILDING_CODES) {
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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('report')
    .dropColumn('remaining_water')
    .dropColumn('water')
    .execute()

  await db.schema
    .alterTable('movement')
    .dropColumn('water')
    .execute()

  await db.schema
    .alterTable('resource_stock')
    .dropColumn('last_water_gather')
    .dropColumn('water')
    .execute()
  // Building rows are a data backfill; they may be upgraded after deploy.
}
