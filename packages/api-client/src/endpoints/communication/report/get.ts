import { ReportBattleMetadata } from '../../../types/report-battle'
import {
  ReportSpyDetectedMetadata,
  ReportSpyMetadata,
} from '../../../types/report-spy'
import { ReportType } from '@server-core/communication/value/report-type'
import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'
import { Resource } from '../../shared/resource'

export interface CommunicationGetReportRequest {
  report_id: string
}

export interface CommunicationGetReportDataResponse {
  id: string
  type: ReportType
  recorded_at: number
  destination: Coordinates
  origin: Coordinates
  was_read: boolean
  troops: {
    code: TroopCode
    count: number
  }[]
  resources: Resource
  remaining_resources: Resource
  battle?: ReportBattleMetadata
  /** Battle reports: `[TAG] Name` of both sides (slice 033). */
  battle_players?: {
    attacker_name: string
    defender_name: string
  }
  /** `reinforcement` reports: who stationed the troops in the city (slice 033). */
  reinforcement?: {
    owner_player_id: string
    owner_name: string
  }
  /** `spy` reports (slice 030). */
  spy?: ReportSpyMetadata
  /** `spy_detected` reports (slice 030). */
  spy_detected?: ReportSpyDetectedMetadata
}

export type CommunicationGetReportResponse = GenericResponse<CommunicationGetReportDataResponse>
