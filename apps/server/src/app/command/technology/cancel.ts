import { Factory } from '#adapter/factory'
import { TechnologyError } from '#core/technology/error'

export interface CancelTechnologyParams {
  player_id: string
}

export async function cancelTechnology({ player_id }: CancelTechnologyParams): Promise<void> {
  const job_queue = Factory.getJobQueue()
  const logger = Factory.getLogger('app:command:technology:cancel')
  logger.info('run')

  const pending = await job_queue.getPendingTechnologyResearch({ player_id })

  if (!pending) {
    throw new Error(TechnologyError.NOT_IN_PROGRESS)
  }

  await job_queue.cancelTechnologyResearchFinish({ player_id })
}
