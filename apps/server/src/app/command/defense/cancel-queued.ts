import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CityError } from '#core/city/error'
import { DefenseError } from '#core/defense/error'

interface CancelQueuedDefenseBuildParams {
  city_id: string
  player_id: string
  queue_item_id: string
}

/** Removes a waiting fortification batch; nothing was paid for it, so nothing is refunded. */
export async function cancelQueuedDefenseBuild({
  city_id,
  player_id,
  queue_item_id,
}: CancelQueuedDefenseBuildParams): Promise<void> {
  return runCommand('defense:cancel-queued-build', async () => {
    const repository = Factory.getRepository()

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const item = await repository.defense_build_queue.getById(queue_item_id)
    if (item.city_id !== city_id) {
      throw new Error(DefenseError.QUEUE_ITEM_NOT_FOUND)
    }

    await repository.defense_build_queue.delete(item.id)
  })
}
