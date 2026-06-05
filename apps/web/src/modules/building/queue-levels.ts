import { BuildingCode } from '@eoneom/api-client'

import { BuildingItem, BuildingUpgradeQueueItem } from '#types'

export type BuildingUpgradeQueueItemWithLevel = BuildingUpgradeQueueItem & {
  level: number
}

export const projectUpgradeQueueLevels = ({
  buildings,
  upgrade_queue
}: {
  buildings: BuildingItem[]
  upgrade_queue: BuildingUpgradeQueueItem[]
}): BuildingUpgradeQueueItemWithLevel[] => {
  const projected = new Map<BuildingCode, number>()

  for (const building of buildings) {
    const level = 'upgrade_at' in building ? building.level + 1 : building.level
    projected.set(building.code, level)
  }

  return upgrade_queue.map(item => {
    const next_level = (projected.get(item.building_code) ?? 0) + 1
    projected.set(item.building_code, next_level)
    return {
      ...item,
      level: next_level
    }
  })
}
