import React from 'react'
import type { TroopIncomingMovement } from '@eoneom/api-client'

import { formatTime } from '#helpers/transform'
import { useTimer } from '#hook/timer'
import { FactionTranslations } from '#faction/translations'
import { TroopTranslations } from '#troop/translations'
import { formatIncomingTarget, formatIncomingUnitCount } from '#movement/incoming/translations'

interface Props {
  movement: TroopIncomingMovement
  onArrived: () => void
}

export const IncomingMovementItem: React.FC<Props> = ({ movement, onArrived }) => {
  const { remainingTime } = useTimer({
    onDone: onArrived,
    doneAt: movement.arrive_at,
  })

  return (
    <li className="rounded-sm border border-danger/60 bg-chrome/70 px-3 py-2">
      <span className="flex items-center justify-between gap-2">
        <span className="text-body text-amber">{formatIncomingTarget(movement.target)}</span>
        <span className="font-mono text-body text-danger">{formatTime(remainingTime)}</span>
      </span>
      {movement.attacker && (
        <span className="mt-1 block text-meta text-amber-dim">
          Attaquant : {movement.attacker.name} ({FactionTranslations[movement.attacker.faction_code].name})
        </span>
      )}
      {movement.unit_count !== undefined && (
        <span className="mt-1 block text-meta text-amber-dim">
          Armée : {formatIncomingUnitCount(movement.unit_count)}
        </span>
      )}
      {movement.troops && (
        <ul className="mt-1 m-0 list-none p-0 text-meta text-label">
          {movement.troops.map(troop => (
            <li key={troop.code}>
              {TroopTranslations[troop.code].name} × {troop.count}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
