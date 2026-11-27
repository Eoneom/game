import { AbuseReportKind } from '@server-core/communication/abuse-report/kind'
import { GenericResponse } from '../../../response'

export interface CommunicationCreateAbuseReportRequest {
  kind: AbuseReportKind
  message_id: string
  /** At most 500 characters. */
  reason?: string
}

export type CommunicationCreateAbuseReportResponse = GenericResponse<void>
