import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { TechnologyError } from '#core/technology/error'

export interface CancelQueuedTechnologyResearchRequest {
  player_id: string
  queue_item_id: string
}

export async function cancelQueuedTechnologyResearch({
  player_id,
  queue_item_id,
}: CancelQueuedTechnologyResearchRequest): Promise<void> {
  return runCommand('technology:cancel-queued-research', async () => {
    const repository = Factory.getRepository()

    const item = await repository.technology_research_queue.getById(queue_item_id)
    if (item.player_id !== player_id) {
      throw new Error(TechnologyError.QUEUE_ITEM_NOT_FOUND)
    }

    await repository.technology_research_queue.delete(item.id)
  })
}
