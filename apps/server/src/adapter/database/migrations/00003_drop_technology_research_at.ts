import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('technology')
    .dropColumn('research_at')
    .execute()

  await db.schema
    .alterTable('technology')
    .dropColumn('research_started_at')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('technology')
    .addColumn('research_at', 'timestamptz')
    .execute()

  await db.schema
    .alterTable('technology')
    .addColumn('research_started_at', 'timestamptz')
    .execute()
}
