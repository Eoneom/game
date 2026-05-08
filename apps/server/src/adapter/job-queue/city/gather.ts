import type { JobQueueContext } from '#adapter/job-queue/context'

export const CITY_RESOURCES_GATHER_QUEUE = 'city.resources.gather'
export const CITY_RESOURCES_GATHER_INTERVAL_MS = 5_000
export const CITY_RESOURCES_GATHER_SINGLETON_KEY = 'global'

export type CityResourcesGatherJobData = Record<string, never>

export type PendingCityResourcesGather = {
  execute_at: number
  job_id: string
}

export const scheduleCityResourcesGather = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: CityResourcesGatherJobData = {}

  ctx.logger.info('schedule city resources gather', { execute_at })

  return ctx.boss.send(CITY_RESOURCES_GATHER_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: CITY_RESOURCES_GATHER_SINGLETON_KEY
  })
}

export const getPendingCityResourcesGather = async (ctx: JobQueueContext): Promise<PendingCityResourcesGather | null> => {
  const jobs = await ctx.boss.findJobs<CityResourcesGatherJobData>(
    CITY_RESOURCES_GATHER_QUEUE,
    { key: CITY_RESOURCES_GATHER_SINGLETON_KEY }
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

export const ensureCityResourcesGatherScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingCityResourcesGather(ctx)
  if (pending) {
    ctx.logger.info('city resources gather already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleCityResourcesGather(ctx, { execute_at })
}
