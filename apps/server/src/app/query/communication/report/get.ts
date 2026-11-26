import { GenericQuery } from '#query/generic'
import { NEUTRAL_COMBAT_MODIFIERS } from '#core/combat/type/battle-stack'
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
      battle: battle ? await this.withCombatModifiers(battle) : undefined,
    }
  }

  private async withCombatModifiers(battle: ReportBattleMetadata): Promise<ReportBattleMetadata> {
    const { state_json } = await this.repository.battle.getById(battle.battle_id)
    return {
      ...battle,
      attacker_modifiers: state_json.attacker_modifiers ?? NEUTRAL_COMBAT_MODIFIERS,
      defender_modifiers: state_json.defender_modifiers ?? NEUTRAL_COMBAT_MODIFIERS,
    }
  }
}
