import type { JobQueueContext } from '#adapter/job-queue/context'
import type { PendingBuildingUpgrade } from '#app/port/job-queue'

export const BUILDING_UPGRADE_FINISH_QUEUE = 'building.upgrade.finish'

export type BuildingUpgradeFinishJobData = {
  player_id: string
  city_id: string
  building_id: string
  level: number
}

export type { PendingBuildingUpgrade }

export const scheduleBuildingUpgradeFinish = async (
  ctx: JobQueueContext,
  {
    player_id,
    city_id,
    building_id,
    level,
    execute_at
  }: {
    player_id: string
    city_id: string
    building_id: string
    level: number
    execute_at: number
  }
): Promise<string | null> => {
  const data: BuildingUpgradeFinishJobData = {
    player_id,
    city_id,
    building_id,
    level
  }

  ctx.logger.info('schedule building upgrade finish', {
    city_id,
    building_id,
    level,
    execute_at
  })

  return ctx.boss.send(BUILDING_UPGRADE_FINISH_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: city_id
  })
}

export const cancelBuildingUpgradeFinish = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<void> => {
  const jobs = await ctx.boss.findJobs<BuildingUpgradeFinishJobData>(
    BUILDING_UPGRADE_FINISH_QUEUE,
    {
      key: city_id,
      queued: true
    }
  )

  if (jobs.length === 0) {
    ctx.logger.info('no queued building upgrade job to cancel', { city_id })
    return
  }

  const ids = jobs.map(job => job.id)
  ctx.logger.info('cancel building upgrade finish', {
    city_id,
    ids
  })
  await ctx.boss.cancel(BUILDING_UPGRADE_FINISH_QUEUE, ids)
}

export const getPendingBuildingUpgrade = async (
  ctx: JobQueueContext,
  { city_id }: { city_id: string }
): Promise<PendingBuildingUpgrade | null> => {
  const jobs = await ctx.boss.findJobs<BuildingUpgradeFinishJobData>(
    BUILDING_UPGRADE_FINISH_QUEUE,
    { key: city_id }
  )

  const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

  if (!job || !job.data) {
    return null
  }

  return {
    player_id: job.data.player_id,
    city_id: job.data.city_id,
    building_id: job.data.building_id,
    level: job.data.level,
    execute_at: job.startAfter.getTime(),
    job_id: job.id
  }
}
