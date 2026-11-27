import React from 'react'

import { defenseKeys, useCityDefenses } from '#defense/hooks'
import { DefenseTranslations } from '#defense/translations'
import { DashboardLink, queryCardState } from '#location/dashboard/card'
import { useCountdownRefetch } from '#location/dashboard/refetch'
import { DashboardQueueCard } from '#city/dashboard/queue-card'

/** « Fortification » (slice 042): the defense build batch and its waiting rows; needs the Enceinte. */
export const FortificationQueueCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useCityDefenses(cityId)
  const refetch = useCountdownRefetch(defenseKeys.list(cityId))
  const data = query.data
  const ongoing = data?.ongoing_build ?? null
  const noWall = data !== undefined && data.city_wall_level === 0 && !ongoing

  return (
    <DashboardQueueCard
      title="Fortification"
      to="/city/$cityId/base/defense"
      params={{ cityId }}
      state={queryCardState(query)}
      onRetry={() => void query.refetch()}
      onJobDone={refetch}
      active={ongoing ? {
        label: `${ongoing.remaining_count} ${DefenseTranslations[ongoing.defense_code].name}`,
        startAt: ongoing.started_at,
        endAt: ongoing.finish_at,
      } : null}
      waiting={(data?.build_queue ?? []).map(item => ({
        id: item.id,
        label: `${item.count} ${DefenseTranslations[item.defense_code].name}`,
      }))}
      limit={data?.build_queue_limit ?? 0}
      empty={{
        sentence: 'Aucune fortification en cours.',
        cta: { label: 'Ériger des défenses', to: '/city/$cityId/base/defense', params: { cityId } },
      }}
      blocked={noWall ? (
        <div className="space-y-1">
          <p className="m-0 text-body text-label">Enceinte requise</p>
          <p className="m-0 text-meta text-amber-dim">
            Construisez l&apos;Enceinte pour ériger des défenses.{' '}
            <DashboardLink to="/city/$cityId/base/defense" params={{ cityId }} search={{ code: 'city_wall' }} className="text-amber">
              Voir l&apos;Enceinte
            </DashboardLink>
          </p>
        </div>
      ) : undefined}
    />
  )
}
