import { AbuseReportEntity } from '#core/communication/abuse-report/entity'
import { AbuseReportRepository } from '#app/port/repository/abuse-report'
import { getDatabase } from '#adapter/database/context'
import { toTimestampRequired } from '#adapter/database/repository/shared/time'

export class PostgresAbuseReportRepository implements AbuseReportRepository {
  async createIfAbsent(report: AbuseReportEntity): Promise<boolean> {
    const result = await getDatabase()
      .insertInto('abuse_report')
      .values({
        id: report.id,
        reporter_id: report.reporter_id,
        author_id: report.author_id,
        kind: report.kind,
        message_id: report.message_id,
        content: report.content,
        reason: report.reason,
        created_at: toTimestampRequired(report.created_at),
      })
      .onConflict(oc => oc.columns([
        'reporter_id',
        'kind',
        'message_id'
      ]).doNothing())
      .executeTakeFirst()

    return Number(result.numInsertedOrUpdatedRows ?? 0) > 0
  }
}
