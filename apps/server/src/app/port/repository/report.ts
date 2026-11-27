import { GenericRepository } from '#app/port/repository/generic'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportBattleMetadata } from '#core/combat/type/report-battle-metadata'
import {
  ReportSpyDetectedMetadata,
  ReportSpyMetadata,
} from '#core/intel/type'

/** One `spy` or `spy_detected` report with its `report_spy` row (slice 030). */
export type SpyReportEntry = {
  report: ReportEntity
  movement_id: string
  spy_player_id: string
  target_player_id: string | null
  metadata: ReportSpyMetadata | ReportSpyDetectedMetadata
}

/** A `battle` report with its `report_battle` row. */
export type BattleReportEntry = {
  report: ReportEntity
  metadata: ReportBattleMetadata
}

export type ReportRepository = GenericRepository<ReportEntity> & {
  createBattleReports(args: {
    attacker_report: ReportEntity
    defender_report: ReportEntity
    attacker_metadata: ReportBattleMetadata
    defender_metadata: ReportBattleMetadata
    /** `reinforcement` perspective reports, one per reinforcement owner (slice 033). */
    reinforcement_reports?: BattleReportEntry[]
  }): Promise<void>

  /** `reinforcement` arrival notice to the host with the troops' owner (slice 033). */
  createReinforcementReport(args: { report: ReportEntity, owner_player_id: string }): Promise<void>

  getReinforcementOwnerByReportId(report_id: string): Promise<string | null>

  getBattleMetadataByReportId(report_id: string): Promise<ReportBattleMetadata | null>

  createSpyReports(entries: SpyReportEntry[]): Promise<void>

  /** Metadata of a `spy` or `spy_detected` report; the report type tells which shape it is. */
  getSpyMetadataByReportId(report_id: string): Promise<ReportSpyMetadata | ReportSpyDetectedMetadata | null>

  list(query: {
    player_id: string
    limit: number
    offset: number
    was_read?: boolean
  }): Promise<{ reports: ReportEntity[]; total: number }>

  getById(id: string): Promise<ReportEntity>

  count(query: { player_id: string, was_read: boolean }): Promise<number>

  markAllAsRead(player_id: string): Promise<void>

  deleteReadOlderThan(before: number): Promise<number>
}
