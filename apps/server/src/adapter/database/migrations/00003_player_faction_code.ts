import {
  Kysely, sql
} from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('player')
    .addColumn('faction_code', 'text')
    .execute()

  await sql`
    UPDATE player
    SET faction_code = 'the_confederation'
  `.execute(db)

  await db.schema
    .alterTable('player')
    .alterColumn('faction_code', (col) => col.setNotNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('player')
    .dropColumn('faction_code')
    .execute()
}
