import React, { useMemo } from 'react'
import { RESEARCH_QUEUE_LIMIT } from '@eoneom/api-client'

import { useLocationActivity } from '#location/activity-hooks'
import { queryCardState } from '#location/dashboard/card'
import { useCountdownRefetch } from '#location/dashboard/refetch'
import { technologyKeys, useListTechnologies } from '#technology/hooks'
import { projectResearchQueueLevels } from '#technology/queue-levels'
import { TechnologyTranslations } from '#technology/translations'
import { TechnologyItem } from '#types'
import { DashboardQueueCard } from '#city/dashboard/queue-card'

/**
 * « Recherche » (slice 042): the player-wide research queue. The active research names its city when it runs
 * elsewhere (city from the activity endpoint, slice 041); waiting rows always name theirs.
 */
export const ResearchQueueCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useListTechnologies({ cityId })
  const { data: activity } = useLocationActivity()
  const refetch = useCountdownRefetch(technologyKeys.list(cityId))
  const technologies = query.data?.technologies
  const researchQueue = query.data?.research_queue

  const inProgress = technologies?.find(
    (technology): technology is Extract<TechnologyItem, { research_at: number }> => 'research_at' in technology
  )
  const waiting = useMemo(
    () => projectResearchQueueLevels({ technologies: technologies ?? [], research_queue: researchQueue ?? [] }),
    [ technologies, researchQueue ]
  )

  const runningCity = activity?.research && inProgress && activity.research.code === inProgress.code
    ? activity.research
    : null
  const elsewhere = runningCity && runningCity.city_id !== cityId ? runningCity.city_name : null

  return (
    <DashboardQueueCard
      title="Recherche"
      to="/city/$cityId/base/technology"
      params={{ cityId }}
      state={queryCardState(query)}
      onRetry={() => void query.refetch()}
      onJobDone={refetch}
      active={inProgress ? {
        label: (
          <>
            {TechnologyTranslations[inProgress.code].name} {inProgress.level} → {inProgress.level + 1}
            {elsewhere ? <span className="text-label"> · {elsewhere}</span> : null}
          </>
        ),
        startAt: inProgress.research_started_at,
        endAt: inProgress.research_at,
      } : null}
      waiting={waiting.map(item => ({
        id: item.id,
        label: (
          <>
            {TechnologyTranslations[item.technology_code].name} → {item.level}
            <span className="text-label"> · {item.city_name}</span>
          </>
        ),
        finishAt: item.finish_at,
      }))}
      limit={RESEARCH_QUEUE_LIMIT}
      empty={{
        sentence: 'Aucune recherche en cours.',
        cta: { label: 'Choisir une technologie', to: '/city/$cityId/base/technology', params: { cityId } },
      }}
    />
  )
}
