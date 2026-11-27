import React from 'react'
import classNames from 'classnames'
import { MovementAction } from '@eoneom/api-client'

import { formatTime } from '#helpers/transform'
import { MovementItem } from '#types'
import { CargoIcons } from '#movement/cargo-icons'
import { formatArrivalClock, secondsUntil } from '#movement/clock'
import { formatTroopLines, formatUnitCount, totalUnits } from '#movement/format'
import { LocationDirectory, formatLocationLabel } from '#movement/location-label'
import { OwnMovementTab, rowOrderLabel } from '#movement/list/sort'

const ACTION_GLYPHS: Record<MovementAction, string> = {
  [MovementAction.EXPLORE]: '◎',
  [MovementAction.BASE]: '⌂',
  [MovementAction.TRANSPORT]: '⇄',
  [MovementAction.ATTACK]: '⚔',
  [MovementAction.SPY]: '◉',
  [MovementAction.REINFORCE]: '⛨',
  [MovementAction.EXCHANGE]: '⚖',
}

export const cellClass = 'px-2 py-1.5 align-middle'

interface Props {
  tab: OwnMovementTab
  movement: MovementItem
  now: number
  directory: LocationDirectory
  selected: boolean
  onSelect: (movementId: string) => void
}

/** « Arrivée dans »: countdown, « En bataille » while an arrived attack fights, « Arrivée… » until the refetch. */
export const ArrivalCountdown: React.FC<{ arrive_at: number; now: number; battle?: boolean; danger?: boolean }> = ({
  arrive_at,
  now,
  battle = false,
  danger = false,
}) => {
  if (battle) {
    return (
      <span className="inline-block rounded-sm border border-danger/60 bg-danger-deep/40 px-1.5 py-0.5 text-caption text-danger">
        En bataille
      </span>
    )
  }
  const remaining = secondsUntil(arrive_at, now)
  return (
    <span className={classNames('font-mono tabular-nums', danger ? 'text-danger' : 'text-amber')}>
      {remaining > 0 ? formatTime(remaining) : 'Arrivée…'}
    </span>
  )
}

/** One own movement (slice 045); Enter on the focused row opens it like a click. */
export const MovementRow: React.FC<Props> = ({ tab, movement, now, directory, selected, onSelect }) => {
  const units = totalUnits(movement.troops)
  const arrival = (
    <>
      <td className={cellClass}>
        <ArrivalCountdown arrive_at={movement.arrive_at} now={now} battle={Boolean(movement.battle_id)} />
      </td>
      <td className={classNames(cellClass, 'font-mono tabular-nums')}>
        {movement.battle_id ? '—' : formatArrivalClock(movement.arrive_at, now)}
      </td>
    </>
  )

  return (
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
      {tab === 'convois' ? (
        <td className={classNames(cellClass, 'text-body')}>{rowOrderLabel(movement)}</td>
      ) : (
        <td className={classNames(cellClass, 'text-body')}>
          {tab === 'sortants' && <span aria-hidden className="mr-1.5 text-label">{ACTION_GLYPHS[movement.action]}</span>}
          {rowOrderLabel(movement)}
        </td>
      )}
      <td className={classNames(cellClass, 'tabular-nums')}>{formatLocationLabel(movement.origin, directory)}</td>
      <td className={classNames(cellClass, 'tabular-nums')}>{formatLocationLabel(movement.destination, directory)}</td>
      {tab !== 'convois' && (
        <td className={classNames(cellClass, 'tabular-nums')} title={formatTroopLines(movement.troops)}>
          {formatUnitCount(units)}
        </td>
      )}
      <td className={cellClass}><CargoIcons resources={movement.resources} /></td>
      {tab === 'convois' && (
        <td className={cellClass}>{formatTroopLines(movement.troops) || '—'}</td>
      )}
      {arrival}
    </tr>
  )
}
