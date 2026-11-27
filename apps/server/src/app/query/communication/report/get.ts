import { GenericQuery } from '#query/generic'
import { getPlayerDisplayNames } from '#query/alliance/display-names'
import { NEUTRAL_COMBAT_MODIFIERS } from '#core/combat/type/battle-stack'
import { ReportBattleMetadata } from '#core/combat/type/report-battle-metadata'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { ReportEntity } from '#core/communication/report/entity'
import { CommunicationError } from '#core/communication/error'
import { ReportType } from '#core/communication/value/report-type'
import {
  ReportSpyDetectedMetadata,
  ReportSpyMetadata,
} from '#core/intel/type'
import { ReportTradeMetadata } from '#core/exchange/type'

export interface CommunicationGetReportQueryRequest {
  player_id: string
  report_id: string
}

export interface CommunicationGetReportQueryResponse {
  report: ReportEntity
  battle?: ReportBattleMetadata
  /** `[TAG] Name` of both sides of a battle report (slice 033). */
  battle_players?: { attacker_name: string, defender_name: string }
  /** `reinforcement` arrival notice: who stationed the troops (slice 033). */
  reinforcement?: { owner_player_id: string, owner_name: string }
  spy?: ReportSpyMetadata
  spy_detected?: ReportSpyDetectedMetadata
  /** `trade` report: one faction exchange fill (slice 035). */
  trade?: ReportTradeView
}

export type ReportTradeView = ReportTradeMetadata & {
  counterparty_player_id: string
  counterparty_name: string
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

    if (report.type === ReportType.SPY || report.type === ReportType.SPY_DETECTED) {
      const metadata = await this.repository.report.getSpyMetadataByReportId(report_id)
      if (!metadata) {
        return { report }
      }
      return report.type === ReportType.SPY
        ? {
          report,
          spy: metadata as ReportSpyMetadata 
        }
        : {
          report,
          spy_detected: metadata as ReportSpyDetectedMetadata 
        }
    }

    if (report.type === ReportType.TRADE) {
      const trade = await this.repository.report.getTradeByReportId(report_id)
      if (!trade) {
        return { report }
      }
      const names = await getPlayerDisplayNames([ trade.counterparty_player_id ])
      return {
        report,
        trade: {
          ...trade.metadata,
          counterparty_player_id: trade.counterparty_player_id,
          counterparty_name: names.get(trade.counterparty_player_id) ?? '',
        },
      }
    }

    if (report.type === ReportType.REINFORCEMENT) {
      const owner_player_id = await this.repository.report.getReinforcementOwnerByReportId(report_id)
      if (!owner_player_id) {
        return { report }
      }
      const names = await getPlayerDisplayNames([ owner_player_id ])
      return {
        report,
        reinforcement: {
          owner_player_id,
          owner_name: names.get(owner_player_id) ?? '',
        },
      }
    }

    const battle = report.type === ReportType.BATTLE
      ? await this.repository.report.getBattleMetadataByReportId(report_id)
      : null

    if (!battle) {
      return { report }
    }

    const names = await getPlayerDisplayNames([
      battle.attacker_player_id,
      battle.defender_player_id
    ])

    return {
      report,
      battle: await this.withCombatModifiers({
        battle,
        viewer_id: player_id
      }),
      battle_players: {
        attacker_name: names.get(battle.attacker_player_id) ?? '',
        defender_name: names.get(battle.defender_player_id) ?? '',
      },
    }
  }

  /** A `reinforcement` perspective shows its owner's Arsenal with the host's Fortification (slice 033). */
  private async withCombatModifiers({
    battle,
    viewer_id
  }: {
    battle: ReportBattleMetadata
    viewer_id: string
  }): Promise<ReportBattleMetadata> {
    const { state_json } = await this.repository.battle.getById(battle.battle_id)
    const defender_modifiers = state_json.defender_modifiers ?? NEUTRAL_COMBAT_MODIFIERS
    const owner_modifiers = battle.perspective === ReportPerspective.REINFORCEMENT
      ? state_json.defender_owner_modifiers?.[viewer_id]
      : undefined
    return {
      ...battle,
      attacker_modifiers: state_json.attacker_modifiers ?? NEUTRAL_COMBAT_MODIFIERS,
      defender_modifiers: owner_modifiers
        ? {
          ...owner_modifiers,
          ...(defender_modifiers.fortification !== undefined ? { fortification: defender_modifiers.fortification } : {}),
        }
        : defender_modifiers,
    }
  }
}
