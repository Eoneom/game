import {
  BUILDING_UPGRADE_FINISH_QUEUE,
  BuildingUpgradeFinishJobData,
  CITY_RESOURCES_GATHER_QUEUE,
  CityResourcesGatherJobData,
  JobQueue,
  OUTPOST_RESOURCES_GATHER_QUEUE,
  OutpostResourcesGatherJobData,
  REPORT_CLEANUP_QUEUE,
  ReportCleanupJobData,
  TECHNOLOGY_RESEARCH_FINISH_QUEUE,
  TechnologyResearchFinishJobData,
  TROOP_MOVEMENT_FINISH_QUEUE,
  TROOP_RECRUIT_PROGRESS_QUEUE,
  TroopMovementFinishJobData,
  TroopRecruitProgressJobData
} from '#adapter/job-queue'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { finishTechnologyResearch } from '#app/command/technology/finish-research'
import { sagaFinishOneMovement } from '#app/saga/finish/movement'
import { progressTroopRecruitment } from '#app/command/troop/progress-recruit'
import { progressGatherAllCities } from '#app/command/city/progress-gather-all'
import { progressGatherAllPermanentOutposts } from '#app/command/outpost/progress-gather-all'
import { cleanupOldReadReports } from '#app/command/communication/report/cleanup-old-read'
import { Factory } from '#adapter/factory'

export const registerJobWorkers = async (jobQueue: JobQueue): Promise<void> => {
  const logger = Factory.getLogger('app:job:register')

  await jobQueue.work<BuildingUpgradeFinishJobData, void, { includeMetadata: true }>(
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

  await jobQueue.work<TechnologyResearchFinishJobData, void, { includeMetadata: true }>(
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

  await jobQueue.work<TroopRecruitProgressJobData, void, { includeMetadata: true }>(
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

  await jobQueue.work<TroopMovementFinishJobData, void, { includeMetadata: true }>(
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

  await jobQueue.work<CityResourcesGatherJobData, void, { includeMetadata: true }>(
    CITY_RESOURCES_GATHER_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing city resources gather', { job_id: job.id })
        await progressGatherAllCities()
      }
    }
  )

  await jobQueue.work<OutpostResourcesGatherJobData, void, { includeMetadata: true }>(
    OUTPOST_RESOURCES_GATHER_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing outpost resources gather', { job_id: job.id })
        await progressGatherAllPermanentOutposts()
      }
    }
  )

  await jobQueue.work<ReportCleanupJobData, void, { includeMetadata: true }>(
    REPORT_CLEANUP_QUEUE,
    { includeMetadata: true },
    async (jobs) => {
      for (const job of jobs) {
        logger.info('processing report cleanup', { job_id: job.id })
        await cleanupOldReadReports()
      }
    }
  )

  logger.info('job workers registered')
}
