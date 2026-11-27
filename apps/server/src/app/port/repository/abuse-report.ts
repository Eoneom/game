import { AbuseReportEntity } from '#core/communication/abuse-report/entity'

export type AbuseReportRepository = {
  /** Inserts unless the reporter already reported this message; returns whether a row was created. */
  createIfAbsent(report: AbuseReportEntity): Promise<boolean>
}
