import React, { useMemo } from 'react'
import { RESEARCH_QUEUE_LIMIT, TechnologyCode } from '@eoneom/api-client'

import { useGetCity } from '#city/hooks'
import { unmetRequirementName, useRequirementEvaluator } from '#requirement/hook'
import { groupByTechnologyBranch } from '#technology/branch'
import { useListTechnologies } from '#technology/hooks'
import { technologyImageSrc } from '#technology/image'
import { TechnologyQueuePanel } from '#technology/list/queue'
import { projectResearchQueueLevels } from '#technology/queue-levels'
import { TechnologyBranchLabels, TechnologyTranslations } from '#technology/translations'
import { TechnologyItem } from '#types'
import { CatalogueCardData } from '#ui/catalogue/card'
import { catalogueCityResources, catalogueStock } from '#ui/catalogue/city'
import { useCatalogueCountdown } from '#ui/catalogue/countdown'
import { CatalogueGrid } from '#ui/catalogue/grid'
import { catalogueCardState } from '#ui/catalogue/state'

interface Props {
  cityId: string
  selectedCode: TechnologyCode | null
  onSelect: (code: TechnologyCode) => void
}

/** Technology catalogue (slice 043): research queue, then cards grouped by branch, priced with the city's lab. */
export const TechnologyList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data } = useListTechnologies({ cityId })
  const { data: city } = useGetCity(cityId)
  const evaluate = useRequirementEvaluator(cityId)

  const technologies = useMemo(() => data?.technologies ?? [], [data])
  const researchQueue = useMemo(() => data?.research_queue ?? [], [data])

  const inProgress = technologies.find(
    (t): t is Extract<TechnologyItem, { research_at: number }> => 'research_at' in t
  )
  const countdown = useCatalogueCountdown(inProgress?.research_started_at, inProgress?.research_at)

  const queued = useMemo(() => {
    const summary = new Map<TechnologyCode, { count: number, target_level: number }>()
    for (const item of projectResearchQueueLevels({ technologies, research_queue: researchQueue })) {
      const previous = summary.get(item.technology_code)
      summary.set(item.technology_code, { count: (previous?.count ?? 0) + 1, target_level: item.level })
    }
    return summary
  }, [technologies, researchQueue])

  const groups = useMemo(() => groupByTechnologyBranch(technologies).map(({ branch, items }) => ({
    id: branch,
    title: TechnologyBranchLabels[branch],
    cards: items.map((technology): CatalogueCardData => {
      const isActive = inProgress?.code === technology.code
      const cost = technology.research_cost
      return {
        code: technology.code,
        name: TechnologyTranslations[technology.code].name,
        image: technologyImageSrc(technology.code),
        amount: { kind: 'level', value: technology.level },
        cost: cost ? { target_label: `▸ niv. ${technology.level + 1}`, ...cost } : undefined,
        stock: catalogueStock(city),
        state: catalogueCardState({
          catalogue: 'technology',
          in_progress: isActive ? { remaining_seconds: countdown?.remaining_seconds } : undefined,
          queued: queued.get(technology.code),
          unmet_requirements: evaluate(technology.requirement).map(unmet => ({
            name: unmetRequirementName(unmet),
            level: unmet.level,
          })),
          queue: { active: inProgress !== undefined, length: researchQueue.length, limit: RESEARCH_QUEUE_LIMIT },
          cost,
          city: catalogueCityResources(city),
        }),
        progress: isActive && countdown ? { elapsed: countdown.elapsed } : undefined,
      }
    }),
  })), [technologies, inProgress?.code, countdown, queued, researchQueue.length, city, evaluate])

  return (
    <CatalogueGrid
      scope="technology"
      groups={groups}
      selectedCode={selectedCode}
      onSelect={code => onSelect(code as TechnologyCode)}
      queue={<TechnologyQueuePanel cityId={cityId} />}
    />
  )
}
