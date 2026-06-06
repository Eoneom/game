import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  processBuildingUpgradeQueue,
  startBuildingUpgrade
} from '#app/command/building/start-upgrade'
import { BuildingCode } from '#core/building/constant/code'
import { BUILDING_UPGRADE_QUEUE_LIMIT } from '#core/building/constant/upgrade-queue'
import { BuildingError } from '#core/building/error'
import { BuildingUpgradeQueueEntity } from '#core/building/upgrade-queue-entity'
import { id } from '#shared/identification'
import { now } from '#shared/time'

export interface BuildingUpgradeRequest {
  player_id: string
  city_id: string
  building_code: BuildingCode
}

async function enqueueBuildingUpgrade({
  city_id,
  building_code
}: {
  city_id: string
  building_code: BuildingCode
}): Promise<void> {
  const repository = Factory.getRepository()

  // Ensure the building exists in this city before queueing
  await repository.building.get({
    city_id,
    code: building_code
  })

  const queue_count = await repository.building_upgrade_queue.countByCity({ city_id })
  if (queue_count >= BUILDING_UPGRADE_QUEUE_LIMIT) {
    throw new Error(BuildingError.QUEUE_FULL)
  }

  await repository.building_upgrade_queue.create(BuildingUpgradeQueueEntity.create({
    id: id(),
    city_id,
    building_code,
    created_at: now()
  }))
}

export async function upgradeBuilding({
  player_id,
  city_id,
  building_code,
}: BuildingUpgradeRequest): Promise<void> {
  return runCommand('building:upgrade', async () => {
    const job_queue = Factory.getJobQueue()

    let pending_upgrade = await job_queue.getPendingBuildingUpgrade({ city_id })

    if (!pending_upgrade) {
      // Unstick queue rows left behind by failed finish jobs (no active upgrade).
      await processBuildingUpgradeQueue({ player_id, city_id })
      pending_upgrade = await job_queue.getPendingBuildingUpgrade({ city_id })
    }

    if (!pending_upgrade) {
      await startBuildingUpgrade({
        player_id,
        city_id,
        building_code
      })
      return
    }

    await enqueueBuildingUpgrade({ city_id, building_code })
  })
}
