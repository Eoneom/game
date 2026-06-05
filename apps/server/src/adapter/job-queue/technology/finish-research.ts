import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingTechnologyResearch } from '#app/port/job-queue'

export const TECHNOLOGY_RESEARCH_FINISH_QUEUE = 'technology.research.finish'

export type TechnologyResearchFinishJobData = {
  player_id: string
  city_id: string
  technology_id: string
  level: number
}

export type { PendingTechnologyResearch }

export const scheduleTechnologyResearchFinish = async (
  ctx: JobQueueContext,
  {
    player_id,
    city_id,
    technology_id,
    level,
    execute_at
  }: {
    player_id: string
    city_id: string
    technology_id: string
    level: number
    execute_at: number
  }
): Promise<string | null> => {
  const data: TechnologyResearchFinishJobData = {
    player_id,
    city_id,
    technology_id,
    level
  }

  ctx.logger.info('schedule technology research finish', {
    player_id,
    city_id,
    technology_id,
    level,
    execute_at
  })

  return ctx.boss.send(TECHNOLOGY_RESEARCH_FINISH_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: player_id
  })
}

export const cancelTechnologyResearchFinish = async (
  ctx: JobQueueContext,
  { player_id }: { player_id: string }
): Promise<void> => {
  const jobs = await ctx.boss.findJobs<TechnologyResearchFinishJobData>(
    TECHNOLOGY_RESEARCH_FINISH_QUEUE,
    {
      key: player_id,
      queued: true
    }
  )

  if (jobs.length === 0) {
    ctx.logger.info('no queued technology research job to cancel', { player_id })
    return
  }

  const ids = jobs.map(job => job.id)
  ctx.logger.info('cancel technology research finish', {
    player_id,
    ids
  })
  await ctx.boss.cancel(TECHNOLOGY_RESEARCH_FINISH_QUEUE, ids)
}

export const getPendingTechnologyResearch = async (
  ctx: JobQueueContext,
  { player_id }: { player_id: string }
): Promise<PendingTechnologyResearch | null> => {
  const jobs = await ctx.boss.findJobs<TechnologyResearchFinishJobData>(
    TECHNOLOGY_RESEARCH_FINISH_QUEUE,
    { key: player_id }
  )

  const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

  if (!job || !job.data) {
    return null
  }

  return {
    player_id: job.data.player_id,
    city_id: job.data.city_id,
    technology_id: job.data.technology_id,
    level: job.data.level,
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}
