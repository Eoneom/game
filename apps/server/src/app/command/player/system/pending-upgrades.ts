import { BuildingService } from '#core/building/service'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import type {
  BuildingListEntry,
  BuildingUpgradeQueueEntry
} from '#query/building/list'
import type {
  TechnologyListEntry,
  TechnologyResearchQueueEntry
} from '#query/technology/list'
import { WarehouseCapacity } from '#shared/resource'

export function countPendingBuildingUpgradesByCode({
  buildings,
  upgrade_queue,
}: {
  buildings: BuildingListEntry[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}): Map<BuildingCode, number> {
  const pending_by_code = new Map<BuildingCode, number>()

  for (const building of buildings) {
    if ('upgrade_at' in building) {
      pending_by_code.set(
        building.code,
        (pending_by_code.get(building.code) ?? 0) + 1
      )
    }
  }

  for (const queue_item of upgrade_queue) {
    pending_by_code.set(
      queue_item.building_code,
      (pending_by_code.get(queue_item.building_code) ?? 0) + 1
    )
  }

  return pending_by_code
}

export function hasPendingBuildingUpgrade({
  building_code,
  buildings,
  upgrade_queue,
}: {
  building_code: BuildingCode
  buildings: BuildingListEntry[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}): boolean {
  return (countPendingBuildingUpgradesByCode({
    buildings,
    upgrade_queue
  }).get(building_code) ?? 0) > 0
}

export function projectBuildingLevelsForPolicy<
  T extends { code: BuildingCode, level: number }
>({
  buildings,
  upgrade_queue,
}: {
  buildings: T[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}): T[] {
  const pending_by_code = countPendingBuildingUpgradesByCode({
    buildings,
    upgrade_queue
  })

  return buildings.map((building) => {
    const pending_count = pending_by_code.get(building.code) ?? 0
    if (pending_count === 0) {
      return building
    }
    return {
      ...building,
      level: building.level + pending_count,
    }
  })
}

export function projectWarehousesCapacity({
  buildings,
  upgrade_queue,
}: {
  buildings: BuildingListEntry[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}): WarehouseCapacity {
  const projected = projectBuildingLevelsForPolicy({
    buildings,
    upgrade_queue
  })

  const plastic_warehouse = projected.find(building => building.code === BuildingCode.PLASTIC_WAREHOUSE)
  const mushroom_warehouse = projected.find(building => building.code === BuildingCode.MUSHROOM_WAREHOUSE)

  const plastic_level = plastic_warehouse?.level ?? 0
  const mushroom_level = mushroom_warehouse?.level ?? 0

  return {
    plastic: BuildingService.getWarehouseCapacity({
      level: plastic_level,
      code: BuildingCode.PLASTIC_WAREHOUSE,
    }),
    mushroom: BuildingService.getWarehouseCapacity({
      level: mushroom_level,
      code: BuildingCode.MUSHROOM_WAREHOUSE,
    }),
  }
}

export function countPendingTechnologyResearchByCode({
  technologies,
  research_queue,
}: {
  technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
}): Map<TechnologyCode, number> {
  const pending_by_code = new Map<TechnologyCode, number>()

  for (const technology of technologies) {
    if ('research_at' in technology) {
      pending_by_code.set(
        technology.code,
        (pending_by_code.get(technology.code) ?? 0) + 1
      )
    }
  }

  for (const queue_item of research_queue) {
    pending_by_code.set(
      queue_item.technology_code,
      (pending_by_code.get(queue_item.technology_code) ?? 0) + 1
    )
  }

  return pending_by_code
}

export function hasPendingTechnologyResearchByCode({
  technology_code,
  technologies,
  research_queue,
}: {
  technology_code: TechnologyCode
  technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
}): boolean {
  return (countPendingTechnologyResearchByCode({
    technologies,
    research_queue
  }).get(technology_code) ?? 0) > 0
}

export function hasPendingTechnologyResearch(
  technologies: TechnologyListEntry[]
): boolean {
  return technologies.some(technology => 'research_at' in technology)
}

export function projectTechnologyLevelsForPolicy<
  T extends { code: TechnologyCode, level: number }
>({
  technologies,
  research_queue = [],
}: {
  technologies: T[]
  research_queue?: TechnologyResearchQueueEntry[]
}): T[] {
  const pending_by_code = countPendingTechnologyResearchByCode({
    technologies: technologies as TechnologyListEntry[],
    research_queue
  })

  return technologies.map((technology) => {
    const pending_count = pending_by_code.get(technology.code) ?? 0
    if (pending_count === 0) {
      return technology
    }
    return {
      ...technology,
      level: technology.level + pending_count,
    }
  })
}
