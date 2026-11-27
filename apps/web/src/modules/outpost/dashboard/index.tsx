import React from 'react'
import { OutpostType } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'
import { useSettleCity } from '#city/hooks'
import { DASHBOARD_GRID_CLASS, DashboardCard, queryCardState } from '#location/dashboard/card'
import { IncomingAlert } from '#location/dashboard/incoming-alert'
import { LocationMovementsCard } from '#location/dashboard/movements-card'
import { OutpostProductionCard } from '#location/dashboard/production-card'
import { useGetOutpost, useSetOutpostCombatStrategy, useSetOutpostPermanent } from '#outpost/hooks'
import { OutpostSettle } from '#outpost/settle'
import { GarrisonCombatStrategy } from '#troop/garrison-strategy'
import { useListOutpostTroops } from '#troop/hooks'
import { Button } from '#ui/button'

const OutpostStatusCard: React.FC<{ outpostId: string }> = ({ outpostId }) => {
  const query = useGetOutpost(outpostId)
  const outpost = query.data?.id === outpostId ? query.data : undefined
  const setPermanent = useSetOutpostPermanent(outpostId)
  const settleCity = useSettleCity()
  const permanent = outpost?.type === OutpostType.PERMANENT

  return (
    <DashboardCard
      title="Statut"
      state={queryCardState({ data: outpost, isError: query.isError })}
      onRetry={() => void query.refetch()}
    >
      <div className="space-y-3">
        <p className="m-0 text-meta text-label">
          Type <span className="text-body text-amber">{permanent ? 'Permanent' : 'Temporaire'}</span>
        </p>
        {permanent ? (
          <p className="m-0 text-meta text-amber-dim">Avant-poste permanent — production active.</p>
        ) : (
          <>
            <p className="m-0 text-meta text-amber-dim">Temporaire — rendez-le permanent pour produire.</p>
            <Button onClick={() => setPermanent.mutate()}>Rendre permanent</Button>
            <OutpostSettle outpostId={outpostId} onSettle={name => settleCity.mutate(name)} />
          </>
        )}
      </div>
    </DashboardCard>
  )
}

const OutpostGarrisonCard: React.FC<{ outpostId: string }> = ({ outpostId }) => {
  const query = useGetOutpost(outpostId)
  const outpost = query.data?.id === outpostId ? query.data : undefined
  const { data: troops } = useListOutpostTroops(outpostId)
  const setCombatStrategy = useSetOutpostCombatStrategy(outpostId)
  const units = troops?.reduce((sum, troop) => sum + troop.count, 0)

  return (
    <DashboardCard
      title="Garnison"
      to="/outpost/$outpostId/troop"
      params={{ outpostId }}
      state={queryCardState({ data: outpost, isError: query.isError })}
      onRetry={() => void query.refetch()}
    >
      {outpost ? (
        <div className="space-y-3">
          {units !== undefined ? (
            <p className="m-0 text-meta text-label">
              <span className="font-mono text-body tabular-nums text-amber">{units}</span> unité{units > 1 ? 's' : ''} stationnée{units > 1 ? 's' : ''}
            </p>
          ) : null}
          <GarrisonCombatStrategy
            framed={false}
            strategy={outpost.default_combat_strategy}
            pending={setCombatStrategy.isPending}
            onChange={strategy => setCombatStrategy.mutate(strategy)}
          />
        </div>
      ) : null}
    </DashboardCard>
  )
}

/**
 * Outpost home `/outpost/$outpostId` (slice 042): the dashboard reduced to what outposts have — incoming attacks,
 * stocks, status (permanent / settle), garrison and movements.
 */
export const OutpostDashboard: React.FC<{ outpostId: string }> = ({ outpostId }) => {
  const { data } = useGetOutpost(outpostId)
  const outpost = data?.id === outpostId ? data : undefined
  const location = { kind: 'outpost' as const, id: outpostId }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-3 border-b border-rust/50 pb-3">
        <h1 className="m-0 text-page text-amber">Avant-poste</h1>
        {outpost ? (
          <span className="font-mono text-meta text-label">{formatCoordinates(outpost.coordinates)}</span>
        ) : (
          <div aria-busy="true" className="h-4 w-16 rounded-sm bg-chrome-3 animate-pulse motion-reduce:animate-none" />
        )}
      </header>

      <div className={DASHBOARD_GRID_CLASS}>
        <IncomingAlert location={location} />
        <OutpostProductionCard outpostId={outpostId} />
        <OutpostStatusCard outpostId={outpostId} />
        <OutpostGarrisonCard outpostId={outpostId} />
        <LocationMovementsCard origin={location} coordinates={outpost?.coordinates} />
      </div>
    </section>
  )
}
