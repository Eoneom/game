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
  /** `spy` reports (slice 030). */
  spy?: ReportSpyMetadata
  /** `spy_detected` reports (slice 030). */
  spy_detected?: ReportSpyDetectedMetadata
}

export type CommunicationGetReportResponse = GenericResponse<CommunicationGetReportDataResponse>
