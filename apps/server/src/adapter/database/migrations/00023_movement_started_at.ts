import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 044: departure time of each movement, so the map can place its progress dot between origin and destination.
 * Written from the `start_at` passed to `TroopService.createMovement`; rows in flight when the migration runs get
 * `now()` (their dot starts at the origin until they arrive).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .addColumn('started_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .dropColumn('started_at')
    .execute()
}
