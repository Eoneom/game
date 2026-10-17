import type { DB } from '#adapter/database/types'
import { Kysely } from 'kysely'

export type ReportBattleMetadataRow = {
  report_id: string
  battle_id: string
  movement_id: string
  perspective: string
  attacker_player_id: string
  defender_player_id: string
  attacker_faction_code: string
  defender_faction_code: string
  target_kind: string
  target_id: string | null
  winner: string
  attacker_strategy: string
  defender_strategy: string
  rounds_played: number
  outcome_json: unknown
  casualties_attacker_json: unknown
  casualties_defender_json: unknown
  round_summaries_json: unknown
}

export async function insertReportBattleRow(
  db: Kysely<DB>,
  row: ReportBattleMetadataRow
): Promise<void> {
  await db.insertInto('report_battle').values({
    report_id: row.report_id,
    battle_id: row.battle_id,
    movement_id: row.movement_id,
    perspective: row.perspective,
    attacker_player_id: row.attacker_player_id,
    defender_player_id: row.defender_player_id,
    attacker_faction_code: row.attacker_faction_code,
    defender_faction_code: row.defender_faction_code,
    target_kind: row.target_kind,
    target_id: row.target_id,
    winner: row.winner,
    attacker_strategy: row.attacker_strategy,
    defender_strategy: row.defender_strategy,
    rounds_played: row.rounds_played,
    outcome_json: row.outcome_json as DB['report_battle']['outcome_json'],
    casualties_attacker_json: row.casualties_attacker_json as DB['report_battle']['casualties_attacker_json'],
    casualties_defender_json: row.casualties_defender_json as DB['report_battle']['casualties_defender_json'],
    round_summaries_json: row.round_summaries_json as DB['report_battle']['round_summaries_json'],
  }).execute()
}

export async function getReportBattleByReportId(
  db: Kysely<DB>,
  report_id: string
): Promise<ReportBattleMetadataRow | null> {
  const row = await db
    .selectFrom('report_battle')
    .selectAll()
    .where('report_id', '=', report_id)
    .executeTakeFirst()

  if (!row) {
    return null
  }

  return row as ReportBattleMetadataRow
}
