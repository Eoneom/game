import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .dropColumn('arrive_at')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .addColumn('arrive_at', 'timestamptz')
    .execute()
}
