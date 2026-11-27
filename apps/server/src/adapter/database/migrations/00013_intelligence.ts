import {
  Kysely, sql
} from 'kysely'

/** Slice 030: Renseignement technologies, backfilled at level 0 for existing players. */
const INTELLIGENCE_TECHNOLOGY_CODES = [
  'espionage',
  'detection',
]

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const code of INTELLIGENCE_TECHNOLOGY_CODES) {
    await sql`
      INSERT INTO technology (player_id, code, level)
      SELECT p.id, ${code}, 0
      FROM player p
      WHERE NOT EXISTS (
        SELECT 1 FROM technology t
        WHERE t.player_id = p.id AND t.code = ${code}
      )
    `.execute(db)
  }

  // `spy` / `spy_detected` report metadata, stored like `report_battle`.
  // `report.type` is free text (no check constraint), so the new report types need no schema change.
  await db.schema
    .createTable('report_spy')
    .addColumn('report_id', 'uuid', (col) => col.primaryKey().references('report.id').onDelete('cascade'))
    .addColumn('movement_id', 'uuid', (col) => col.notNull())
    .addColumn('spy_player_id', 'uuid', (col) => col.notNull())
    .addColumn('target_player_id', 'uuid')
    .addColumn('target_json', 'jsonb', (col) => col.notNull())
    .addColumn('metadata_json', 'jsonb', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('report_spy').execute()
  // Technology rows are a data backfill; they may be researched after deploy.
}
