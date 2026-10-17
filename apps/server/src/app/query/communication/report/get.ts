import { GenericQuery } from '#query/generic'
import { ReportBattleMetadata } from '#core/combat/type/report-battle-metadata'
import { ReportEntity } from '#core/communication/report/entity'
import { CommunicationError } from '#core/communication/error'
import { ReportType } from '#core/communication/value/report-type'

export interface CommunicationGetReportQueryRequest {
  player_id: string
  report_id: string
}

export interface CommunicationGetReportQueryResponse {
  report: ReportEntity
  battle?: ReportBattleMetadata
}

export class CommunicationGetReportQuery extends GenericQuery<CommunicationGetReportQueryRequest, CommunicationGetReportQueryResponse> {
  constructor() {
    super({ name: 'communication:report:get' })
  }

  protected async get({
    player_id,
    report_id
  }: CommunicationGetReportQueryRequest): Promise<CommunicationGetReportQueryResponse> {
    const report = await this.repository.report.getById(report_id)
    if (!report.isOwnedBy(player_id)) {
      throw new Error(CommunicationError.REPORT_NOT_OWNER)
    }

    const battle = report.type === ReportType.BATTLE
      ? await this.repository.report.getBattleMetadataByReportId(report_id)
      : null

    return {
      report,
      battle: battle ?? undefined,
    }
  }
}
