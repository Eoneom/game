import { TechnologyCode } from '#core/technology/constant/code'
import type {
  TechnologyListEntry,
  TechnologyResearchQueueEntry,
} from '#query/technology/list'
import { hasPendingTechnologyResearchByCode } from '#command/player/system/pending-upgrades'

/** Highest-priority system AI research order (first entry = tried first). */
export const SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY: TechnologyCode[] = [
  TechnologyCode.ARCHITECTURE,
  TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION,
  TechnologyCode.REPLICATION_CATALYST,
  TechnologyCode.OUTPOST_LOGISTICS,
]

export type SystemResearchTechnology = {
  code: TechnologyCode
  level: number
}

function systemResearchRank(code: TechnologyCode): number {
  const index = SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY.indexOf(code)
  if (index === -1) {
    return SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY.length
  }
  return index
}

export function sortTechnologiesForSystemResearch({
  technologies,
  all_technologies,
  research_queue,
}: {
  technologies: SystemResearchTechnology[]
  all_technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
}): SystemResearchTechnology[] {
  return [ ...technologies ]
    .filter(technology => !hasPendingTechnologyResearchByCode({
      technology_code: technology.code,
      technologies: all_technologies,
      research_queue,
    }))
    .sort((a, b) => {
      const rank_diff = systemResearchRank(a.code) - systemResearchRank(b.code)
      if (rank_diff !== 0) {
        return rank_diff
      }
      return a.level - b.level
    })
}
