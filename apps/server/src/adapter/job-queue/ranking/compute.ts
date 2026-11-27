import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingRankingCompute } from '#app/port/job-queue'

export const RANKING_COMPUTE_QUEUE = 'ranking.compute'
const RANKING_COMPUTE_SINGLETON_KEY = 'global'

export type RankingComputeJobData = Record<string, never>

export const scheduleRankingCompute = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: RankingComputeJobData = {}

  ctx.logger.info('schedule ranking compute', { execute_at })

  return ctx.boss.send(RANKING_COMPUTE_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: RANKING_COMPUTE_SINGLETON_KEY
  })
}

export const getPendingRankingCompute = async (ctx: JobQueueContext): Promise<PendingRankingCompute | null> => {
  const jobs = await ctx.boss.findJobs<RankingComputeJobData>(
    RANKING_COMPUTE_QUEUE,
    { key: RANKING_COMPUTE_SINGLETON_KEY }
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

export const ensureRankingComputeScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingRankingCompute(ctx)
  if (pending) {
    ctx.logger.info('ranking compute already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleRankingCompute(ctx, { execute_at })
}
