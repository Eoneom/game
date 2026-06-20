import {
  BUILDING_UPGRADE_FINISH_QUEUE,
  type BuildingUpgradeFinishJobData,
  CITY_RESOURCES_GATHER_QUEUE,
  type CityResourcesGatherJobData,
  JobQueue as PgBossJobQueue,
  OUTPOST_RESOURCES_GATHER_QUEUE,
  type OutpostResourcesGatherJobData,
  REPORT_CLEANUP_QUEUE,
  type ReportCleanupJobData,
  SYSTEM_PLAYER_TICK_QUEUE,
  type SystemPlayerTickJobData,
  TECHNOLOGY_RESEARCH_FINISH_QUEUE,
  type TechnologyResearchFinishJobData,
  TROOP_MOVEMENT_FINISH_QUEUE,
  TROOP_RECRUIT_PROGRESS_QUEUE,
  type TroopMovementFinishJobData,
  type TroopRecruitProgressJobData
} from '#adapter/job-queue'
import type { JobQueue } from '#app/port/job-queue'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { finishTechnologyResearch } from '#app/command/technology/finish-research'
import { sagaFinishOneMovement } from '#app/saga/finish/movement'
import { progressTroopRecruitment } from '#app/command/troop/progress-recruit'
import { progressGatherAllCities } from '#app/command/city/progress-gather-all'
import { progressGatherAllPermanentOutposts } from '#app/command/outpost/progress-gather-all'
import { cleanupOldReadReports } from '#app/command/communication/report/cleanup-old-read'
import { tickSystemPlayers } from '#app/command/player/system/tick'
import { Factory } from '#adapter/factory'

const asPgBossJobQueue = (queue: JobQueue): PgBossJobQueue => {
  if (!(queue instanceof PgBossJobQueue)) {
    throw new Error('expected pg-boss JobQueue adapter')
  }
  return queue
}

export const registerJobWorkers = async (jobQueue: JobQueue = Factory.getJobQueue()): Promise<void> => {
  const queue = asPgBossJobQueue(jobQueue)
  const logger = Factory.getLogger('adapter:job-queue:register-workers')

  await queue.work<BuildingUpgradeFinishJobData, void, { includeMetadata: true }>(
    BUILDING_UPGRADE_FINISH_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        const data = job.data
        if (!data) {
          logger.warn('building upgrade finish job missing data', { job_id: job.id })
          continue
        }

        logger.info('processing building upgrade finish', {
          job_id: job.id,
          city_id: data.city_id,
          building_id: data.building_id
        })

        await finishBuildingUpgrade({
          player_id: data.player_id,
          city_id: data.city_id,
          building_id: data.building_id,
          level: data.level,
          upgraded_at: job.startAfter.getTime()
        })
      }
    }
  )

  await queue.work<TechnologyResearchFinishJobData, void, { includeMetadata: true }>(
    TECHNOLOGY_RESEARCH_FINISH_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        const data = job.data
        if (!data) {
          logger.warn('technology research finish job missing data', { job_id: job.id })
          continue
        }

        logger.info('processing technology research finish', {
          job_id: job.id,
          player_id: data.player_id,
          technology_id: data.technology_id
        })

        await finishTechnologyResearch({
          player_id: data.player_id,
          technology_id: data.technology_id,
          level: data.level,
        })
      }
    }
  )

  await queue.work<TroopRecruitProgressJobData, void, { includeMetadata: true }>(
    TROOP_RECRUIT_PROGRESS_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        const data = job.data
        if (!data) {
          logger.warn('troop recruit progress job missing data', { job_id: job.id })
          continue
        }

        logger.info('processing troop recruit progress', {
          job_id: job.id,
          city_id: data.city_id,
          troop_id: data.troop_id,
          remaining_count: data.remaining_count
        })

        await progressTroopRecruitment({
          player_id: data.player_id,
          city_id: data.city_id,
          troop_id: data.troop_id,
          remaining_count: data.remaining_count,
          finish_at: data.finish_at,
          started_at: data.started_at,
          last_progress: data.last_progress,
        })
      }
    }
  )

  await queue.work<TroopMovementFinishJobData, void, { includeMetadata: true }>(
    TROOP_MOVEMENT_FINISH_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        const data = job.data
        if (!data) {
          logger.warn('troop movement finish job missing data', { job_id: job.id })
          continue
        }

        logger.info('processing troop movement finish', {
          job_id: job.id,
          player_id: data.player_id,
          movement_id: data.movement_id
        })

        await sagaFinishOneMovement({
          player_id: data.player_id,
          movement_id: data.movement_id,
          arrived_at: job.startAfter.getTime(),
        })
      }
    }
  )

  await queue.work<CityResourcesGatherJobData, void, { includeMetadata: true }>(
    CITY_RESOURCES_GATHER_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing city resources gather', { job_id: job.id })
        await progressGatherAllCities()
      }
    }
  )

  await queue.work<OutpostResourcesGatherJobData, void, { includeMetadata: true }>(
    OUTPOST_RESOURCES_GATHER_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing outpost resources gather', { job_id: job.id })
        await progressGatherAllPermanentOutposts()
      }
    }
  )

  await queue.work<ReportCleanupJobData, void, { includeMetadata: true }>(
    REPORT_CLEANUP_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing report cleanup', { job_id: job.id })
        await cleanupOldReadReports()
      }
    }
  )

  const tick_logger = Factory.getTickLogger('adapter:job-queue:register-workers')

  await queue.work<SystemPlayerTickJobData, void, { includeMetadata: true }>(
    SYSTEM_PLAYER_TICK_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        const tick_index = job.data?.tick_index ?? 0
        tick_logger.info('processing system player tick', {
          job_id: job.id,
          tick_index
        })
        await tickSystemPlayers({ tick_index })
      }
    }
  )

  logger.info('job workers registered')
}
