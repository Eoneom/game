import { Factory } from '#adapter/factory'
import { OUTPOST_RESOURCES_GATHER_INTERVAL_MS } from '#app/scheduling/intervals'
import { outpostGather } from '#app/command/outpost/gather'
import { runCommand } from '#command/run'
import { now } from '#shared/time'

export async function progressGatherAllPermanentOutposts(): Promise<void> {
  return runCommand('outpost:progress-gather-all', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:outpost:progress-gather-all')
    const gather_at_time = now()

    const outposts = await repository.outpost.listPermanent()
    logger.info('gathering resources for all permanent outposts', { outpost_count: outposts.length })

    await Promise.all(outposts.map(outpost => outpostGather({
      player_id: outpost.player_id,
      outpost_id: outpost.id,
      gather_at_time
    })))

    await job_queue.scheduleOutpostResourcesGather({
      execute_at: gather_at_time + OUTPOST_RESOURCES_GATHER_INTERVAL_MS
    })
  })
}
