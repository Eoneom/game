import { Factory } from '#adapter/factory'
import { CITY_RESOURCES_GATHER_INTERVAL_MS } from '#adapter/job-queue'
import { cityGather } from '#app/command/city/gather'
import { runCommand } from '#command/run'
import { now } from '#shared/time'

export async function progressGatherAllCities(): Promise<void> {
  return runCommand('city:progress-gather-all', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:city:progress-gather-all')
    const gather_at_time = now()

    const cities = await repository.city.listAll()
    logger.info('gathering resources for all cities', { city_count: cities.length })

    await Promise.all(cities.map(city => cityGather({
      player_id: city.player_id,
      city_id: city.id,
      gather_at_time
    })))

    await job_queue.scheduleCityResourcesGather({
      execute_at: gather_at_time + CITY_RESOURCES_GATHER_INTERVAL_MS
    })
  })
}
