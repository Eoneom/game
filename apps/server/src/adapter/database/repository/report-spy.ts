import type { DB } from '#adapter/database/types'
import { Kysely } from 'kysely'

type ReportSpyRow = {
  report_id: string
  movement_id: string
  spy_player_id: string
  target_player_id: string | null
  target_json: unknown
  metadata_json: unknown
}

/** Same pre-serialization as `report_battle` (node-postgres would send arrays as Postgres array literals). */
const toJsonb = (value: unknown): DB['report_spy']['metadata_json'] => JSON.stringify(value) as unknown as DB['report_spy']['metadata_json']

export async function insertReportSpyRow(
  db: Kysely<DB>,
  row: ReportSpyRow
): Promise<void> {
  await db.insertInto('report_spy').values({
    report_id: row.report_id,
    movement_id: row.movement_id,
    spy_player_id: row.spy_player_id,
    target_player_id: row.target_player_id,
    target_json: toJsonb(row.target_json),
    metadata_json: toJsonb(row.metadata_json),
  }).execute()
}

export async function getReportSpyByReportId(
  db: Kysely<DB>,
  report_id: string
): Promise<ReportSpyRow | null> {
  const row = await db
    .selectFrom('report_spy')
    .selectAll()
    .where('report_id', '=', report_id)
    .executeTakeFirst()

  return row ?? null
}
