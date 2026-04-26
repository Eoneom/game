import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { TechnologyError } from '#core/technology/error'

export interface CancelTechnologyParams {
  player_id: string
}

export async function cancelTechnology({ player_id }: CancelTechnologyParams): Promise<void> {
  return runCommand('technology:cancel', async () => {
    const job_queue = Factory.getJobQueue()

    const pending = await job_queue.getPendingTechnologyResearch({ player_id })

    if (!pending) {
      throw new Error(TechnologyError.NOT_IN_PROGRESS)
    }

    await job_queue.cancelTechnologyResearchFinish({ player_id })
  })
}
