import { BuildingCode } from '#core/building/constant/code'
import {
  Levels,
  RequirementService
} from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import {
  projectBuildingLevelsForPolicy,
  projectTechnologyLevelsForPolicy,
} from '#command/player/system/pending-upgrades'
import type { BuildingUpgradeQueueEntry } from '#query/building/list'
import type { TechnologyResearchQueueEntry } from '#query/technology/list'

export function levelsFrom({
  buildings,
  technologies
}: {
  buildings: { code: BuildingCode, level: number }[]
  technologies: { code: TechnologyCode, level: number }[]
}): Levels {
  return {
    building: Object.fromEntries(buildings.map(building => [
      building.code,
      building.level
    ])),
    technology: Object.fromEntries(technologies.map(technology => [
      technology.code,
      technology.level
    ])),
  }
}

/**
 * Match human commands: `start*` paths read current DB levels only.
 * Queue enqueue paths may assume pending upgrades/research complete first.
 */
export function levelsForSystemRequirementGate({
  use_projected_levels,
  buildings,
  technologies,
  upgrade_queue = [],
  research_queue = [],
}: {
  use_projected_levels: boolean
  buildings: { code: BuildingCode, level: number }[]
  technologies: { code: TechnologyCode, level: number }[]
  upgrade_queue?: BuildingUpgradeQueueEntry[]
  research_queue?: TechnologyResearchQueueEntry[]
}): Levels {
  const building_levels = use_projected_levels
    ? projectBuildingLevelsForPolicy({
      buildings,
      upgrade_queue,
    })
    : buildings
  const technology_levels = use_projected_levels
    ? projectTechnologyLevelsForPolicy({
      technologies,
      research_queue,
    })
    : technologies

  return levelsFrom({
    buildings: building_levels,
    technologies: technology_levels,
  })
}

export function isRequirementMet({ check }: {
  check: () => void
}): boolean {
  try {
    check()
    return true
  } catch {
    return false
  }
}

export function meetsBuildingUpgradeRequirement({
  building_code,
  levels,
}: {
  building_code: BuildingCode
  levels: Levels
}): boolean {
  return isRequirementMet({
    check: () => RequirementService.checkBuildingRequirement({
      building_code,
      levels,
    }),
  })
}

export function meetsTechnologyResearchRequirement({
  technology_code,
  technology_level,
  levels,
}: {
  technology_code: TechnologyCode
  technology_level: number
  levels: Levels
}): boolean {
  return isRequirementMet({
    check: () => RequirementService.checkTechnologyRequirement({
      technology_code,
      technology_level,
      levels,
    }),
  })
}

export function meetsTroopRecruitRequirement({
  troop_code,
  levels,
}: {
  troop_code: TroopCode
  levels: Levels
}): boolean {
  return isRequirementMet({
    check: () => RequirementService.checkTroopRequirement({
      troop_code,
      levels,
    }),
  })
}
