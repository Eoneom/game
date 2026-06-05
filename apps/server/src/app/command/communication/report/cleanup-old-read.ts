import { Factory } from '#adapter/factory'
import { REPORT_CLEANUP_INTERVAL_MS } from '#app/scheduling/intervals'
import { runCommand } from '#command/run'
import { now } from '#shared/time'

export const REPORT_READ_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export async function cleanupOldReadReports(): Promise<void> {
  return runCommand('communication:report:cleanup-old-read', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:communication:report:cleanup-old-read')
    const cleanup_at = now()

    const deleted_count = await repository.report.deleteReadOlderThan(
      cleanup_at - REPORT_READ_RETENTION_MS
    )

    logger.info('cleaned up old read reports', { deleted_count })

    await job_queue.scheduleReportCleanup({
      execute_at: cleanup_at + REPORT_CLEANUP_INTERVAL_MS
    })
  })
}
