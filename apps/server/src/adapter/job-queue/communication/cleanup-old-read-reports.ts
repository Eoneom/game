import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingReportCleanup } from '#app/port/job-queue'

export const REPORT_CLEANUP_QUEUE = 'communication.report.cleanup-old-read'
export const REPORT_CLEANUP_SINGLETON_KEY = 'global'

export type ReportCleanupJobData = Record<string, never>

export type { PendingReportCleanup }

export const scheduleReportCleanup = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: ReportCleanupJobData = {}

  ctx.logger.info('schedule report cleanup', { execute_at })

  return ctx.boss.send(REPORT_CLEANUP_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: REPORT_CLEANUP_SINGLETON_KEY
  })
}

export const getPendingReportCleanup = async (ctx: JobQueueContext): Promise<PendingReportCleanup | null> => {
  const jobs = await ctx.boss.findJobs<ReportCleanupJobData>(
    REPORT_CLEANUP_QUEUE,
    { key: REPORT_CLEANUP_SINGLETON_KEY }
  )

  const job = jobs.find(candidate => candidate.state === 'created')
    ?? jobs.find(candidate => candidate.state === 'retry')
    ?? jobs.find(candidate => candidate.state === 'active')

  if (!job) {
    return null
  }

  return {
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}

export const ensureReportCleanupScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingReportCleanup(ctx)
  if (pending) {
    ctx.logger.info('report cleanup already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleReportCleanup(ctx, { execute_at })
}
