import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyItem, TechnologyResearchQueueItem } from '#types'

export type TechnologyResearchQueueItemWithLevel = TechnologyResearchQueueItem & {
  level: number
}

export const projectResearchQueueLevels = ({
  technologies,
  research_queue
}: {
  technologies: TechnologyItem[]
  research_queue: TechnologyResearchQueueItem[]
}): TechnologyResearchQueueItemWithLevel[] => {
  const projected = new Map<TechnologyCode, number>()

  for (const technology of technologies) {
    const level = 'research_at' in technology ? technology.level + 1 : technology.level
    projected.set(technology.code, level)
  }

  return research_queue.map(item => {
    const next_level = (projected.get(item.technology_code) ?? 0) + 1
    projected.set(item.technology_code, next_level)
    return {
      ...item,
      level: next_level
    }
  })
}
