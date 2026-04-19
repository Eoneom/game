import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('building')
    .dropColumn('upgrade_at')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('building')
    .addColumn('upgrade_at', 'timestamptz')
    .execute()
}
