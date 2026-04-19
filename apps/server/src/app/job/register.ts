import {
  BUILDING_UPGRADE_FINISH_QUEUE,
  BuildingUpgradeFinishJobData,
  JobQueue
} from '#adapter/job-queue'
import { sagaFinishUpgrade } from '#app/saga/finish/upgrade'
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

        await sagaFinishUpgrade({
          player_id: data.player_id,
          city_id: data.city_id,
          building_id: data.building_id,
          level: data.level,
          upgraded_at: job.startAfter.getTime()
        })
      }
    }
  )

  logger.info('job workers registered')
}
