import { TechnologyCode } from '#core/technology/constant/code'
import type {
  TechnologyListEntry,
  TechnologyResearchQueueEntry,
} from '#query/technology/list'
import { hasPendingTechnologyResearchByCode } from '#command/player/system/pending-upgrades'

const SYSTEM_FOUNDATION_RESEARCH_PRIORITY: TechnologyCode[] = [
  TechnologyCode.ARCHITECTURE,
  TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
  TechnologyCode.REPLICATION_CATALYST,
  TechnologyCode.OUTPOST_LOGISTICS,
  TechnologyCode.OUTPOST_EXPANSION,
]

const SYSTEM_ECONOMY_RESEARCH_PRIORITY: TechnologyCode[] = [
  TechnologyCode.AGRONOMY,
  TechnologyCode.ADVANCED_RECYCLING,
  TechnologyCode.STORAGE_COMPRESSION,
  TechnologyCode.PLASMA_CONTAINMENT,
]

const SYSTEM_ARSENAL_RESEARCH_PRIORITY: TechnologyCode[] = [
  TechnologyCode.BALLISTIC_ALLOYS,
  TechnologyCode.ORGANIC_PLATING,
  TechnologyCode.TACTICAL_PROPULSION,
  // Unlocks turrets for the system defense policy (slice 029).
  TechnologyCode.FORTIFICATION,
]

/** Highest-priority system AI research order (first entry = tried first). */
export const SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY: TechnologyCode[] = [
  ...SYSTEM_FOUNDATION_RESEARCH_PRIORITY,
  ...SYSTEM_ECONOMY_RESEARCH_PRIORITY,
  ...SYSTEM_ARSENAL_RESEARCH_PRIORITY,
]

/** Aggressive profiles (Ash Liturgy, slice 025) research Arsenal ahead of Économie. */
const SYSTEM_ARSENAL_FIRST_RESEARCH_PRIORITY: TechnologyCode[] = [
  ...SYSTEM_FOUNDATION_RESEARCH_PRIORITY,
  ...SYSTEM_ARSENAL_RESEARCH_PRIORITY,
  ...SYSTEM_ECONOMY_RESEARCH_PRIORITY,
]

export function systemTechnologyResearchPriority({ arsenal_first }: {
  arsenal_first: boolean
}): TechnologyCode[] {
  return arsenal_first
    ? SYSTEM_ARSENAL_FIRST_RESEARCH_PRIORITY
    : SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY
}

export type SystemResearchTechnology = {
  code: TechnologyCode
  level: number
}

function systemResearchRank(code: TechnologyCode, priority: TechnologyCode[]): number {
  const index = priority.indexOf(code)
  if (index === -1) {
    return priority.length
  }
  return index
}

export function sortTechnologiesForSystemResearch({
  technologies,
  all_technologies,
  research_queue,
  priority = SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY,
}: {
  technologies: SystemResearchTechnology[]
  all_technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
  priority?: TechnologyCode[]
}): SystemResearchTechnology[] {
  return [ ...technologies ]
    .filter(technology => !hasPendingTechnologyResearchByCode({
      technology_code: technology.code,
      technologies: all_technologies,
      research_queue,
    }))
    .sort((a, b) => {
      const rank_diff = systemResearchRank(a.code, priority) - systemResearchRank(b.code, priority)
      if (rank_diff !== 0) {
        return rank_diff
      }
      return a.level - b.level
    })
}
