import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('report')
    .addColumn('plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('remaining_plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('report')
    .addColumn('remaining_mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('report')
    .dropColumn('remaining_mushroom')
    .execute()

  await db.schema
    .alterTable('report')
    .dropColumn('remaining_plastic')
    .execute()

  await db.schema
    .alterTable('report')
    .dropColumn('mushroom')
    .execute()

  await db.schema
    .alterTable('report')
    .dropColumn('plastic')
    .execute()
}
