import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('player')
    .addColumn('system_controlled', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('player')
    .dropColumn('system_controlled')
    .execute()
}
