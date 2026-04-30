import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('troop')
    .dropColumn('recruitment_finish_at')
    .execute()

  await db.schema
    .alterTable('troop')
    .dropColumn('recruitment_remaining_count')
    .execute()

  await db.schema
    .alterTable('troop')
    .dropColumn('recruitment_last_progress')
    .execute()

  await db.schema
    .alterTable('troop')
    .dropColumn('recruitment_started_at')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('troop')
    .addColumn('recruitment_finish_at', 'timestamptz')
    .execute()

  await db.schema
    .alterTable('troop')
    .addColumn('recruitment_remaining_count', 'integer')
    .execute()

  await db.schema
    .alterTable('troop')
    .addColumn('recruitment_last_progress', 'timestamptz')
    .execute()

  await db.schema
    .alterTable('troop')
    .addColumn('recruitment_started_at', 'timestamptz')
    .execute()
}
