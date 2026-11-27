import React from 'react'
import type { TroopIncomingMovement } from '@eoneom/api-client'

import { formatTime } from '#helpers/transform'
import { useNow } from '#hook/now'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { FactionTranslations } from '#faction/translations'
import { TroopTranslations } from '#troop/translations'
import { formatIncomingTarget, formatIncomingUnitCount } from '#movement/incoming/translations'
import { formatArrivalClock, secondsUntil } from '#movement/clock'

interface Props {
  movement: TroopIncomingMovement
}

/**
 * Incoming attack (slice 030) in the details panel of the movements page and the 044 map drawer: built from the
 * cached `GET /troop/movement/incoming` row, fields gated by the Détection level.
 */
export const IncomingMovementDetails: React.FC<Props> = ({ movement }) => {
  const now = useNow()
  const remaining = secondsUntil(movement.arrive_at, now)

  return (
    <LayoutDetailsContent>
      <h2 className="text-danger">Attaque entrante</h2>
      <div className="details-block">
        <p className="details-meta">Cible : <span className="text-amber">{formatIncomingTarget(movement.target)}</span></p>
        <p className="details-meta">
          Arrivée dans{' '}
          <span className="font-mono tabular-nums text-danger">{remaining > 0 ? formatTime(remaining) : 'Arrivée…'}</span>
          {' '}·{' '}
          <time className="tabular-nums" dateTime={new Date(movement.arrive_at).toISOString()}>
            {formatArrivalClock(movement.arrive_at, now)}
          </time>
        </p>
        <p className="details-meta">
          Attaquant :{' '}
          {movement.attacker
            ? `${movement.attacker.name} (${FactionTranslations[movement.attacker.faction_code].name})`
            : 'Inconnu'}
        </p>
        <p className="details-meta">
          Armée : {movement.unit_count !== undefined ? formatIncomingUnitCount(movement.unit_count) : 'Inconnue'}
        </p>
      </div>
      {movement.troops && (
        <>
          <h3>Composition</h3>
          <ul>
            {movement.troops.map(troop => (
              <li key={troop.code}>
                {TroopTranslations[troop.code].name} × {troop.count}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-meta text-label">Ces informations dépendent de votre niveau de Détection.</p>
    </LayoutDetailsContent>
  )
}
