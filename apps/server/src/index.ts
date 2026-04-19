import './load-env'

import { generateWorld } from '#app/command/world/generate'
import { Factory } from '#adapter/factory'
import { WorldError } from '#core/world/error'
import { gameTimeScale } from '#shared/game-time-scale'
import { launchServer } from '#web/http'
import { sync_task } from '#cron/index'
import { registerJobWorkers } from '#app/job/register'

(async () => {
  const repository = Factory.getRepository()
  const jobQueue = Factory.getJobQueue()
  const logger = Factory.getLogger('index')
  if (gameTimeScale !== 1) {
    logger.warn('game time scale active', { gameTimeScale })
  }
  await repository.connect()
  await jobQueue.start()
  await registerJobWorkers(jobQueue)

  try {
    await generateWorld()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.message !== WorldError.ALREADY_EXISTS) {
      logger.error(err.message)
    }
  }

  launchServer()

  sync_task.start()

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
