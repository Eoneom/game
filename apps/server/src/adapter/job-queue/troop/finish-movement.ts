import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingTroopMovementFinish } from '#app/port/job-queue'

export const TROOP_MOVEMENT_FINISH_QUEUE = 'troop.movement.finish'

export type TroopMovementFinishJobData = {
  player_id: string
  movement_id: string
}

export type { PendingTroopMovementFinish }

export const scheduleTroopMovementFinish = async (
  ctx: JobQueueContext,
  {
    player_id,
    movement_id,
    execute_at
  }: {
    player_id: string
    movement_id: string
    execute_at: number
  }
): Promise<string | null> => {
  const data: TroopMovementFinishJobData = {
    player_id,
    movement_id
  }

  ctx.logger.info('schedule troop movement finish', {
    player_id,
    movement_id,
    execute_at
  })

  return ctx.boss.send(TROOP_MOVEMENT_FINISH_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: movement_id
  })
}

export const cancelTroopMovementFinish = async (
  ctx: JobQueueContext,
  { movement_id }: { movement_id: string }
): Promise<void> => {
  const jobs = await ctx.boss.findJobs<TroopMovementFinishJobData>(
    TROOP_MOVEMENT_FINISH_QUEUE,
    {
      key: movement_id,
      queued: true
    }
  )

  if (jobs.length === 0) {
    ctx.logger.info('no queued troop movement finish job to cancel', { movement_id })
    return
  }

  const ids = jobs.map(job => job.id)
  ctx.logger.info('cancel troop movement finish', {
    movement_id,
    ids
  })
  await ctx.boss.cancel(TROOP_MOVEMENT_FINISH_QUEUE, ids)
}

export const getPendingTroopMovementFinish = async (
  ctx: JobQueueContext,
  { movement_id }: { movement_id: string }
): Promise<PendingTroopMovementFinish | null> => {
  const jobs = await ctx.boss.findJobs<TroopMovementFinishJobData>(
    TROOP_MOVEMENT_FINISH_QUEUE,
    { key: movement_id }
  )

  const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

  if (!job || !job.data) {
    return null
  }

  return {
    player_id: job.data.player_id,
    movement_id: job.data.movement_id,
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}
