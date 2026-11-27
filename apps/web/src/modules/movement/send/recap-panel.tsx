import React from 'react'
import { CombatStrategy, Coordinates, MovementAction, TroopCode } from '@eoneom/api-client'

import { formatCoordinates, formatTime } from '#helpers/transform'
import { useNow } from '#hook/now'
import { TroopTranslations } from '#troop/translations'
import { CombatStrategyLabels } from '#movement/translations'
import { CargoIcons } from '#movement/cargo-icons'
import { formatArrivalClock } from '#movement/clock'
import { formatUnitCount, totalUnits } from '#movement/format'
import { MovementCapacityReadout } from '#movement/capacity'
import { MovementSendCargo, SendableAction } from '#movement/send/search'
import { estimatedArrival } from '#movement/send/step-summary'

interface Props {
  originLabel: string
  destination: Coordinates | null
  destinationLabel: string | null
  action: SendableAction | undefined
  actionLabel: string | null
  troops: { code: TroopCode; count: number }[]
  cargo: MovementSendCargo
  strategy: CombatStrategy
  /** Estimate duration in seconds, once troops are chosen. */
  durationSeconds: number | null
  capacity: { used: number; limit: number } | undefined
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-0.5">
    <dt className="text-caption uppercase tracking-wider text-label">{label}</dt>
    <dd className="m-0 text-body text-amber">{children}</dd>
  </div>
)

/** Live « Récapitulatif » of the send wizard, visible at every step (slice 045). */
export const MovementSendRecapPanel: React.FC<Props> = ({
  originLabel,
  destination,
  destinationLabel,
  action,
  actionLabel,
  troops,
  cargo,
  strategy,
  durationSeconds,
  capacity,
}) => {
  const now = useNow()
  const arrival = durationSeconds !== null ? estimatedArrival(now, durationSeconds) : null

  return (
    <section className="space-y-3" aria-label="Récapitulatif">
      <h2 className="m-0 text-heading text-amber">Récapitulatif</h2>
      <dl className="m-0 space-y-2">
        <Row label="Départ">{originLabel}</Row>
        <Row label="Destination">
          {destination ? (
            <>
              <span className="font-mono tabular-nums">{formatCoordinates(destination)}</span>
              {destinationLabel && <span className="block text-meta text-amber-dim">{destinationLabel}</span>}
            </>
          ) : <span className="text-label">À choisir</span>}
        </Row>
        <Row label="Ordre">{actionLabel ?? <span className="text-label">À choisir</span>}</Row>
        <Row label="Troupes">
          {troops.length ? (
            <>
              {formatUnitCount(totalUnits(troops))}
              <ul className="m-0 list-none p-0 text-meta text-amber-dim">
                {troops.map(troop => (
                  <li key={troop.code}>{TroopTranslations[troop.code].name} × {troop.count}</li>
                ))}
              </ul>
            </>
          ) : <span className="text-label">Aucune</span>}
        </Row>
        {action === MovementAction.TRANSPORT && <Row label="Cargaison"><CargoIcons resources={cargo} /></Row>}
        {action === MovementAction.ATTACK && <Row label="Stratégie">{CombatStrategyLabels[strategy]}</Row>}
        {durationSeconds !== null && arrival !== null && (
          <Row label="Arrivée">
            <span className="font-mono tabular-nums">{formatArrivalClock(arrival, now)}</span>
            <span className="block text-meta text-amber-dim">Durée {formatTime(Math.ceil(durationSeconds))}</span>
          </Row>
        )}
      </dl>
      {capacity && <MovementCapacityReadout used={capacity.used} limit={capacity.limit} />}
    </section>
  )
}
