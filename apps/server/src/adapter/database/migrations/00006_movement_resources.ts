import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .addColumn('plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .alterTable('movement')
    .addColumn('mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .dropColumn('mushroom')
    .execute()

  await db.schema
    .alterTable('movement')
    .dropColumn('plastic')
    .execute()
}
