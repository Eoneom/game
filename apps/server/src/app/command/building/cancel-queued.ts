import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { BuildingError } from '#core/building/error'
import { CityError } from '#core/city/error'

export interface BuildingCancelQueuedUpgradeRequest {
  city_id: string
  player_id: string
  queue_item_id: string
}

export async function cancelQueuedBuildingUpgrade({
  city_id,
  player_id,
  queue_item_id,
}: BuildingCancelQueuedUpgradeRequest): Promise<void> {
  return runCommand('building:cancel-queued-upgrade', async () => {
    const repository = Factory.getRepository()

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const item = await repository.building_upgrade_queue.getById(queue_item_id)
    if (item.city_id !== city_id) {
      throw new Error(BuildingError.QUEUE_ITEM_NOT_FOUND)
    }

    await repository.building_upgrade_queue.delete(item.id)
  })
}
