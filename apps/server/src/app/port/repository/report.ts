import { GenericRepository } from '#app/port/repository/generic'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportBattleMetadata } from '#core/combat/type/report-battle-metadata'

export type ReportRepository = GenericRepository<ReportEntity> & {
  createBattleReports(args: {
    attacker_report: ReportEntity
    defender_report: ReportEntity
    attacker_metadata: ReportBattleMetadata
    defender_metadata: ReportBattleMetadata
  }): Promise<void>

  getBattleMetadataByReportId(report_id: string): Promise<ReportBattleMetadata | null>

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
