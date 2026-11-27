import React from 'react'
import { CombatStrategy } from '@eoneom/api-client'

import { useGetCity } from '#city/hooks'
import { freeDefensePoints } from '#defense/capacity'
import { useCityDefenses } from '#defense/hooks'
import { CombatStrategyLabels } from '#movement/translations'
import { DashboardCard, queryCardState } from '#location/dashboard/card'

/** « Défense » (slice 042): defense points of the Enceinte, defense counts and the garrison strategy. */
export const DefenseCapacityCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useCityDefenses(cityId)
  const { data: city } = useGetCity(cityId)
  const data = query.data

  return (
    <DashboardCard
      title="Défense"
      to="/city/$cityId/base/defense"
      params={{ cityId }}
      state={queryCardState(query)}
      onRetry={() => void query.refetch()}
    >
      {data ? <DefenseCapacityBody data={data} strategy={city?.id === cityId ? city.default_combat_strategy : undefined} /> : null}
    </DashboardCard>
  )
}

const DefenseCapacityBody: React.FC<{
  data: NonNullable<ReturnType<typeof useCityDefenses>['data']>
  strategy: CombatStrategy | undefined
}> = ({ data, strategy }) => {
  const strategyLine = strategy ? (
    <p className="m-0 text-meta text-label">Garnison : <span className="text-amber-dim">{CombatStrategyLabels[strategy]}</span></p>
  ) : null

  if (data.city_wall_level === 0) {
    return (
      <div className="space-y-2">
        <p className="m-0 text-meta text-amber-dim">Aucune capacité défensive : construisez l&apos;Enceinte.</p>
        {strategyLine}
      </div>
    )
  }

  const { total, used, queued } = data.capacity
  const percent = total > 0 ? Math.min(100, Math.round(((used + queued) / total) * 100)) : 0
  const defenseCount = data.defenses.reduce((sum, defense) => sum + defense.count, 0)
  const armedCount = data.defenses.reduce((sum, defense) => sum + (defense.armed ? defense.count : 0), 0)

  return (
    <div className="space-y-2">
      <p className="m-0 text-meta text-label">
        Points{' '}
        <span className="font-mono text-body tabular-nums text-amber">{used}</span>
        {queued > 0 ? <span className="font-mono tabular-nums text-amber-dim"> (+{queued})</span> : null}
        <span className="font-mono tabular-nums text-amber-dim"> / {total}</span>
      </p>
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-label="Points de défense utilisés"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-chrome"
        >
          <div className="h-full bg-amber" style={{ width: `${percent}%` }} />
        </div>
        <span className="shrink-0 font-mono text-meta tabular-nums text-amber-dim">{percent} %</span>
      </div>
      <p className="m-0 text-meta text-label">
        libres : <span className="font-mono tabular-nums text-amber">{freeDefensePoints(data.capacity)}</span>
      </p>
      <p className="m-0 text-meta text-label">
        Enceinte niveau <span className="font-mono tabular-nums text-amber">{data.city_wall_level}</span>
      </p>
      <p className="m-0 text-meta text-label">
        <span className="font-mono tabular-nums text-amber">{defenseCount}</span> défense{defenseCount > 1 ? 's' : ''} dont{' '}
        <span className="font-mono tabular-nums text-amber">{armedCount}</span> armée{armedCount > 1 ? 's' : ''}
      </p>
      {strategyLine}
    </div>
  )
}
