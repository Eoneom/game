import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingChatCleanup } from '#app/port/job-queue'

export const CHAT_CLEANUP_QUEUE = 'communication.chat.cleanup'
const CHAT_CLEANUP_SINGLETON_KEY = 'global'

export type ChatCleanupJobData = Record<string, never>

export const scheduleChatCleanup = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: ChatCleanupJobData = {}

  ctx.logger.info('schedule chat cleanup', { execute_at })

  return ctx.boss.send(CHAT_CLEANUP_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: CHAT_CLEANUP_SINGLETON_KEY
  })
}

export const getPendingChatCleanup = async (ctx: JobQueueContext): Promise<PendingChatCleanup | null> => {
  const jobs = await ctx.boss.findJobs<ChatCleanupJobData>(
    CHAT_CLEANUP_QUEUE,
    { key: CHAT_CLEANUP_SINGLETON_KEY }
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

export const ensureChatCleanupScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingChatCleanup(ctx)
  if (pending) {
    ctx.logger.info('chat cleanup already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleChatCleanup(ctx, { execute_at })
}
