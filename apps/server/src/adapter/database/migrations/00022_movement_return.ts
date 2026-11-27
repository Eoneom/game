import { Kysely } from 'kysely'

/**
 * Slice 045: return trips are flagged so the movements page can list them apart from outgoing orders. Set by
 * `createReturnBaseTrip`, the automatic reinforcement return and the owner's recall. Existing rows stay `false`.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .addColumn('is_return', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .dropColumn('is_return')
    .execute()
}
