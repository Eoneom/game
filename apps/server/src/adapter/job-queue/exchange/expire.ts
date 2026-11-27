import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingExchangeOrderExpire } from '#app/port/job-queue'

export const EXCHANGE_ORDER_EXPIRE_QUEUE = 'exchange.order.expire'
const EXCHANGE_ORDER_EXPIRE_SINGLETON_KEY = 'global'

export type ExchangeOrderExpireJobData = Record<string, never>

export const scheduleExchangeOrderExpire = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const data: ExchangeOrderExpireJobData = {}

  ctx.logger.info('schedule exchange order expire', { execute_at })

  return ctx.boss.send(EXCHANGE_ORDER_EXPIRE_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: EXCHANGE_ORDER_EXPIRE_SINGLETON_KEY
  })
}

export const getPendingExchangeOrderExpire = async (ctx: JobQueueContext): Promise<PendingExchangeOrderExpire | null> => {
  const jobs = await ctx.boss.findJobs<ExchangeOrderExpireJobData>(
    EXCHANGE_ORDER_EXPIRE_QUEUE,
    { key: EXCHANGE_ORDER_EXPIRE_SINGLETON_KEY }
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

export const ensureExchangeOrderExpireScheduled = async (
  ctx: JobQueueContext,
  { execute_at }: {
    execute_at: number
  }
): Promise<string | null> => {
  const pending = await getPendingExchangeOrderExpire(ctx)
  if (pending) {
    ctx.logger.info('exchange order expire already scheduled', {
      job_id: pending.job_id,
      execute_at: pending.execute_at
    })
    return pending.job_id
  }

  return scheduleExchangeOrderExpire(ctx, { execute_at })
}
