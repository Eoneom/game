import type { JobQueueContext } from '#adapter/job-queue/context'
import type {
  DefenseBuildProgressJobData,
  PendingDefenseBuildProgress
} from '#app/port/job-queue'

export const DEFENSE_BUILD_PROGRESS_QUEUE = 'defense.build.progress'

export type { DefenseBuildProgressJobData }

export const scheduleDefenseBuildProgress = async (
  ctx: JobQueueContext,
  {
    player_id,
    city_id,
    defense_code,
    remaining_count,
    finish_at,
    started_at,
    last_progress,
    execute_at
  }: DefenseBuildProgressJobData & {
    execute_at: number
  }
): Promise<string | null> => {
  const data: DefenseBuildProgressJobData = {
    player_id,
    city_id,
    defense_code,
    remaining_count,
    finish_at,
    started_at,
    last_progress
  }

  ctx.logger.info('schedule defense build progress', {
    city_id,
    defense_code,
    remaining_count,
    finish_at,
    execute_at
  })

  return ctx.boss.send(DEFENSE_BUILD_PROGRESS_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: city_id
  })
}

export const cancelDefenseBuildProgress = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<void> => {
  const jobs = await ctx.boss.findJobs<DefenseBuildProgressJobData>(
    DEFENSE_BUILD_PROGRESS_QUEUE,
    {
      key: city_id,
      queued: true
    }
  )

  if (jobs.length === 0) {
    ctx.logger.info('no queued defense build progress job to cancel', { city_id })
    return
  }

  const ids = jobs.map(job => job.id)
  ctx.logger.info('cancel defense build progress', {
    city_id,
    ids
  })
  await ctx.boss.cancel(DEFENSE_BUILD_PROGRESS_QUEUE, ids)
}

export const getPendingDefenseBuildProgress = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<PendingDefenseBuildProgress | null> => {
  const jobs = await ctx.boss.findJobs<DefenseBuildProgressJobData>(
    DEFENSE_BUILD_PROGRESS_QUEUE,
    { key: city_id }
  )

  const job = jobs.find(candidate => candidate.state === 'created')
    ?? jobs.find(candidate => candidate.state === 'retry')
    ?? jobs.find(candidate => candidate.state === 'active')

  if (!job || !job.data) {
    return null
  }

  return {
    player_id: job.data.player_id,
    city_id: job.data.city_id,
    defense_code: job.data.defense_code,
    remaining_count: job.data.remaining_count,
    finish_at: job.data.finish_at,
    started_at: job.data.started_at,
    last_progress: job.data.last_progress,
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}
