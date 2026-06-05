import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingOutpostResourcesGather } from '#app/port/job-queue'

export const OUTPOST_RESOURCES_GATHER_QUEUE = 'outpost.resources.gather'
export const OUTPOST_RESOURCES_GATHER_SINGLETON_KEY = 'global'

export type OutpostResourcesGatherJobData = Record<string, never>

export type { PendingOutpostResourcesGather }

export const scheduleOutpostResourcesGather = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: OutpostResourcesGatherJobData = {}

  ctx.logger.info('schedule outpost resources gather', { execute_at })

  return ctx.boss.send(OUTPOST_RESOURCES_GATHER_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: OUTPOST_RESOURCES_GATHER_SINGLETON_KEY
  })
}

export const getPendingOutpostResourcesGather = async (ctx: JobQueueContext): Promise<PendingOutpostResourcesGather | null> => {
  const jobs = await ctx.boss.findJobs<OutpostResourcesGatherJobData>(
    OUTPOST_RESOURCES_GATHER_QUEUE,
    { key: OUTPOST_RESOURCES_GATHER_SINGLETON_KEY }
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

export const ensureOutpostResourcesGatherScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingOutpostResourcesGather(ctx)
  if (pending) {
    ctx.logger.info('outpost resources gather already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleOutpostResourcesGather(ctx, { execute_at })
}
