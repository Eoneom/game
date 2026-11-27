import React from 'react'

import { FactionTranslations } from '#faction/translations'
import { formatDurationMmSs } from '#helpers/transform'
import { useCountdownProgress } from '#hook/countdown-progress'
import { formatIncomingUnitCount } from '#movement/incoming/translations'
import { MovementOrigin, movementListPath } from '#movement/navigation'
import { troopKeys, useListIncomingMovements } from '#troop/hooks'
import { DashboardCard, DashboardLink } from '#location/dashboard/card'
import { useCountdownRefetch } from '#location/dashboard/refetch'

const ENTRANTS_TAB = { tab: 'entrants' }

const FirstArrival: React.FC<{ arriveAt: number }> = ({ arriveAt }) => {
  const refetch = useCountdownRefetch(troopKeys.incomingMovements)
  const { remainingSeconds } = useCountdownProgress({ endAt: arriveAt, onDone: refetch })
  return <span className="font-mono tabular-nums text-danger">{formatDurationMmSs(remainingSeconds)}</span>
}

/**
 * « Attaques entrantes » alert row (slice 042): only when an attack targets this location. The server already
 * returns nothing at Détection 0, the attacker from 2 and the army size from 3 (slice 030).
 */
export const IncomingAlert: React.FC<{ location: MovementOrigin }> = ({ location }) => {
  const { data: incomings = [] } = useListIncomingMovements()
  const attacks = incomings
    .filter(movement => movement.target.kind === location.kind && movement.target.id === location.id)
    .sort((a, b) => a.arrive_at - b.arrive_at)

  if (!attacks.length) {
    return null
  }

  const first = attacks[0]
  const plural = attacks.length > 1 ? 's' : ''
  const target = location.kind === 'city' ? 'cette ville' : 'cet avant-poste'
  const listPath = movementListPath(location)

  return (
    <DashboardCard
      title="Attaques entrantes"
      to={listPath}
      search={ENTRANTS_TAB}
      tone="alert"
      role="status"
      state="ready"
      className="col-span-full"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="m-0 text-body text-ink">
          <span aria-hidden className="text-danger">⚠ </span>
          {attacks.length} attaque{plural} vers {target}
          {' · '}première arrivée <FirstArrival arriveAt={first.arrive_at} />
          {first.attacker ? (
            <> · <span className="text-amber">{first.attacker.name}</span> <span className="text-label">({FactionTranslations[first.attacker.faction_code].name})</span></>
          ) : null}
          {first.unit_count !== undefined ? <> · {formatIncomingUnitCount(first.unit_count)}</> : null}
        </p>
        <DashboardLink to={listPath} search={ENTRANTS_TAB} className="text-meta text-amber">
          Voir les déplacements
        </DashboardLink>
      </div>
    </DashboardCard>
  )
}
