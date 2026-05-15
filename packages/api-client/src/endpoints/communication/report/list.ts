import { ReportType } from '@server-core/communication/value/report-type'
import { GenericResponse } from '../../../response'
import { Coordinates } from '../../shared/coordinates'

export interface CommunicationListReportRequest {
  page?: number
  was_read?: boolean
}

export interface CommunicationListReportDataResponse {
  reports: {
    id: string
    type: ReportType
    recorded_at: number
    was_read: boolean
    origin: Coordinates
    destination: Coordinates
  }[]
  total: number
  page_size: number
}

export type CommunicationListReportResponse = GenericResponse<CommunicationListReportDataResponse>
