import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CityError } from '#core/city/error'
import { TroopError } from '#core/troop/error'

interface CancelQueuedTroopRecruitmentParams {
  city_id: string
  player_id: string
  queue_item_id: string
}

/** Removes a waiting batch; nothing was paid for it, so nothing is refunded. */
export async function cancelQueuedTroopRecruitment({
  city_id,
  player_id,
  queue_item_id,
}: CancelQueuedTroopRecruitmentParams): Promise<void> {
  return runCommand('troop:cancel-queued-recruitment', async () => {
    const repository = Factory.getRepository()

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const item = await repository.troop_recruit_queue.getById(queue_item_id)
    if (item.city_id !== city_id) {
      throw new Error(TroopError.QUEUE_ITEM_NOT_FOUND)
    }

    await repository.troop_recruit_queue.delete(item.id)
  })
}
