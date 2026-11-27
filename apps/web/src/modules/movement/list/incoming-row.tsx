import React from 'react'
import classNames from 'classnames'
import type { TroopIncomingMovement } from '@eoneom/api-client'

import { FactionTranslations } from '#faction/translations'
import { formatArrivalClock } from '#movement/clock'
import { formatTroopLines } from '#movement/format'
import { formatIncomingTarget, formatIncomingUnitCount } from '#movement/incoming/translations'
import { ArrivalCountdown, cellClass } from '#movement/list/row'

interface Props {
  movement: TroopIncomingMovement
  now: number
  selected: boolean
  onSelect: (movementId: string) => void
}

/** One incoming attack (slice 030), as revealed by the Détection level. */
export const IncomingMovementRow: React.FC<Props> = ({ movement, now, selected, onSelect }) => (
  <tr
    tabIndex={0}
    aria-current={selected ? true : undefined}
    onClick={() => onSelect(movement.id)}
    onKeyDown={event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        onSelect(movement.id)
      }
    }}
    className={classNames(
      'h-8 cursor-pointer border-t border-rust/30 outline-none transition hover:bg-chrome/60 focus-visible:bg-chrome/80',
      selected ? 'bg-chrome text-amber' : 'text-amber-dim'
    )}
  >
    <td className={classNames(cellClass, 'text-body')}>{formatIncomingTarget(movement.target)}</td>
    <td className={cellClass}>
      {movement.attacker
        ? `${movement.attacker.name} (${FactionTranslations[movement.attacker.faction_code].name})`
        : 'Inconnu'}
    </td>
    <td className={cellClass} title={movement.troops ? formatTroopLines(movement.troops) : undefined}>
      {movement.unit_count !== undefined ? formatIncomingUnitCount(movement.unit_count) : 'Inconnue'}
    </td>
    <td className={cellClass}><ArrivalCountdown arrive_at={movement.arrive_at} now={now} danger /></td>
    <td className={classNames(cellClass, 'font-mono tabular-nums')}>{formatArrivalClock(movement.arrive_at, now)}</td>
  </tr>
)
