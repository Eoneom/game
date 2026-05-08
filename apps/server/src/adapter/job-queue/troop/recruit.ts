import type { JobQueueContext } from '#adapter/job-queue/context'

export const TROOP_RECRUIT_PROGRESS_QUEUE = 'troop.recruit.progress'
export const TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS = 5_000

export type TroopRecruitProgressJobData = {
  player_id: string
  city_id: string
  troop_id: string
  remaining_count: number
  finish_at: number
  started_at: number
  last_progress: number
}

export type PendingTroopRecruitProgress = TroopRecruitProgressJobData & {
  execute_at: number
  job_id: string
}

export const nextTroopRecruitProgressAt = ({
  finish_at,
  remaining_count,
  now: now_ms
}: {
  finish_at: number
  remaining_count: number
  now: number
}): number => {
  const remaining_ms = Math.max(0, finish_at - now_ms)
  if (remaining_ms === 0 || remaining_count <= 0) {
    return finish_at
  }

  const ms_per_unit = remaining_ms / remaining_count
  const delay = Math.min(remaining_ms, Math.max(TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS, ms_per_unit))
  return now_ms + delay
}

export const scheduleTroopRecruitProgress = async (
  ctx: JobQueueContext,
  {
    player_id,
    city_id,
    troop_id,
    remaining_count,
    finish_at,
    started_at,
    last_progress,
    execute_at
  }: TroopRecruitProgressJobData & {
    execute_at: number
  }
): Promise<string | null> => {
  const data: TroopRecruitProgressJobData = {
    player_id,
    city_id,
    troop_id,
    remaining_count,
    finish_at,
    started_at,
    last_progress
  }

  ctx.logger.info('schedule troop recruit progress', {
    city_id,
    troop_id,
    remaining_count,
    finish_at,
    execute_at
  })

  return ctx.boss.send(TROOP_RECRUIT_PROGRESS_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: city_id
  })
}

export const cancelTroopRecruitProgress = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<void> => {
  const jobs = await ctx.boss.findJobs<TroopRecruitProgressJobData>(
    TROOP_RECRUIT_PROGRESS_QUEUE,
    {
      key: city_id,
      queued: true
    }
  )

  if (jobs.length === 0) {
    ctx.logger.info('no queued troop recruit progress job to cancel', { city_id })
    return
  }

  const ids = jobs.map(job => job.id)
  ctx.logger.info('cancel troop recruit progress', {
    city_id,
    ids
  })
  await ctx.boss.cancel(TROOP_RECRUIT_PROGRESS_QUEUE, ids)
}

export const getPendingTroopRecruitProgress = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<PendingTroopRecruitProgress | null> => {
  const jobs = await ctx.boss.findJobs<TroopRecruitProgressJobData>(
    TROOP_RECRUIT_PROGRESS_QUEUE,
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
    troop_id: job.data.troop_id,
    remaining_count: job.data.remaining_count,
    finish_at: job.data.finish_at,
    started_at: job.data.started_at,
    last_progress: job.data.last_progress,
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}
