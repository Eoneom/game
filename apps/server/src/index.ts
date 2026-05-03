import './load-env'

import { generateWorld } from '#app/command/world/generate'
import { Factory } from '#adapter/factory'
import { migrateToLatest } from '#adapter/database/migrate'
import { WorldError } from '#core/world/error'
import { gameTimeScale } from '#shared/game-time-scale'
import { launchServer } from '#web/http'
import { registerJobWorkers } from '#app/job/register'
import { now } from '#shared/time'

(async () => {
  const repository = Factory.getRepository()
  const jobQueue = Factory.getJobQueue()
  const logger = Factory.getLogger('index')
  if (gameTimeScale !== 1) {
    logger.warn('game time scale active', { gameTimeScale })
  }
  await repository.connect()
  await migrateToLatest()
  await jobQueue.start()
  await registerJobWorkers(jobQueue)
  await jobQueue.ensureCityResourcesGatherScheduled({ execute_at: now() })

  try {
    await generateWorld()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.message !== WorldError.ALREADY_EXISTS) {
      logger.error(err.message)
    }
  }

  launchServer()

  let shutting_down = false
  const shutdown = async () => {
    if (shutting_down) {
      return
    }
    shutting_down = true
    logger.info('shutting down...')
    try {
      await jobQueue.stop()
    } catch (err) {
      logger.error('failed to stop job queue', { err })
    }
    process.exit(0)
  }
  process.on('SIGTERM', () => {
    void shutdown()
  })
  process.on('SIGINT', () => {
    void shutdown()
  })
})()
