import type { JobQueueContext } from '#adapter/job-queue/context'
import { createTickLogger } from '#adapter/logger'
import type {
  PendingSystemPlayerTick, SystemPlayerTickJobData 
} from '#app/port/job-queue'

export const SYSTEM_PLAYER_TICK_QUEUE = 'player.system.tick'
export const SYSTEM_PLAYER_TICK_SINGLETON_KEY = 'global'

export type {
  SystemPlayerTickJobData, PendingSystemPlayerTick 
}

export const scheduleSystemPlayerTick = async (
  ctx: JobQueueContext,
  {
    execute_at, tick_index 
  }: {
    execute_at: number
    tick_index: number
  }
): Promise<string | null> => {
  const data: SystemPlayerTickJobData = { tick_index }

  createTickLogger('job-queue').info('schedule system player tick', {
    execute_at,
    tick_index
  })

  return ctx.boss.send(SYSTEM_PLAYER_TICK_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: SYSTEM_PLAYER_TICK_SINGLETON_KEY
  })
}

export const getPendingSystemPlayerTick = async (ctx: JobQueueContext): Promise<PendingSystemPlayerTick | null> => {
  const jobs = await ctx.boss.findJobs<SystemPlayerTickJobData>(
    SYSTEM_PLAYER_TICK_QUEUE,
    { key: SYSTEM_PLAYER_TICK_SINGLETON_KEY }
  )

  const job = jobs.find(candidate => candidate.state === 'created')
    ?? jobs.find(candidate => candidate.state === 'retry')
    ?? jobs.find(candidate => candidate.state === 'active')

  if (!job) {
    return null
  }

  return {
    execute_at: job.startAfter.getTime(),
    job_id: job.id,
    tick_index: job.data?.tick_index ?? 0
  }
}

export const ensureSystemPlayerTickScheduled = async (
  ctx: JobQueueContext,
  {
    execute_at, tick_index 
  }: {
    execute_at: number
    tick_index: number
  }
): Promise<string | null> => {
  const pending = await getPendingSystemPlayerTick(ctx)
  if (pending) {
    createTickLogger('job-queue').info('system player tick already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at,
      tick_index: pending.tick_index
    })
    return pending.job_id
  }

  return scheduleSystemPlayerTick(ctx, {
    execute_at,
    tick_index
  })
}
