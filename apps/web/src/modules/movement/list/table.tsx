import React from 'react'
import type { TroopIncomingMovement } from '@eoneom/api-client'

import { MovementItem } from '#types'
import { LocationDirectory } from '#movement/location-label'
import { MovementSort, OwnMovementTab, sortMovements } from '#movement/list/sort'
import { MovementRow } from '#movement/list/row'
import { IncomingMovementRow } from '#movement/list/incoming-row'

const headerClass = 'px-2 py-1 font-normal'

interface SortHeaderProps {
  label: string
  sort: MovementSort
  onSort: (sort: MovementSort) => void
  /** `arrival` toggles ascending / descending; `action` sorts by order then arrival. */
  column: 'arrival' | 'action'
}

const SortHeader: React.FC<SortHeaderProps> = ({ label, sort, onSort, column }) => {
  const active = column === 'arrival' ? sort === 'arrival' || sort === '-arrival' : sort === 'action'
  const ariaSort = !active ? 'none' : sort === '-arrival' ? 'descending' : 'ascending'
  const next: MovementSort = column === 'action' ? 'action' : sort === 'arrival' ? '-arrival' : 'arrival'
  return (
    <th scope="col" className={headerClass} aria-sort={ariaSort}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-amber"
        onClick={() => onSort(next)}
      >
        {label}
        <span aria-hidden>{active ? (sort === '-arrival' ? '▼' : '▲') : '↕'}</span>
      </button>
    </th>
  )
}

const Head: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>
    <tr className="text-left text-caption uppercase tracking-wider text-label">{children}</tr>
  </thead>
)

interface MovementTableProps {
  tab: OwnMovementTab
  movements: readonly MovementItem[]
  sort: MovementSort
  onSort: (sort: MovementSort) => void
  now: number
  directory: LocationDirectory
  selectedId?: string
  onSelect: (movementId: string) => void
}

/** Compact table of « Sortants », « Retours » or « Convois » (slice 045). */
export const MovementTable: React.FC<MovementTableProps> = ({
  tab,
  movements,
  sort,
  onSort,
  now,
  directory,
  selectedId,
  onSelect,
}) => (
  <table className="w-full border-collapse text-meta">
    <Head>
      {tab === 'convois'
        ? <th scope="col" className={headerClass}>Trajet</th>
        : <SortHeader label="Ordre" column="action" sort={sort} onSort={onSort} />}
      <th scope="col" className={headerClass}>Départ</th>
      <th scope="col" className={headerClass}>Destination</th>
      {tab !== 'convois' && <th scope="col" className={headerClass}>Troupes</th>}
      <th scope="col" className={headerClass}>Cargaison</th>
      {tab === 'convois' && <th scope="col" className={headerClass}>Transporteurs</th>}
      <SortHeader label="Arrivée dans" column="arrival" sort={sort} onSort={onSort} />
      <th scope="col" className={headerClass}>Heure</th>
    </Head>
    <tbody>
      {sortMovements(movements, sort).map(movement => (
        <MovementRow
          key={movement.id}
          tab={tab}
          movement={movement}
          now={now}
          directory={directory}
          selected={movement.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </tbody>
  </table>
)

interface IncomingTableProps {
  movements: readonly TroopIncomingMovement[]
  sort: MovementSort
  onSort: (sort: MovementSort) => void
  now: number
  selectedId?: string
  onSelect: (movementId: string) => void
}

/** « Entrants »: hostile attacks revealed by the Détection level (slice 030). */
export const IncomingMovementTable: React.FC<IncomingTableProps> = ({
  movements,
  sort,
  onSort,
  now,
  selectedId,
  onSelect,
}) => (
  <table className="w-full border-collapse text-meta">
    <Head>
      <th scope="col" className={headerClass}>Cible</th>
      <th scope="col" className={headerClass}>Attaquant</th>
      <th scope="col" className={headerClass}>Armée</th>
      <SortHeader label="Arrivée dans" column="arrival" sort={sort} onSort={onSort} />
      <th scope="col" className={headerClass}>Heure</th>
    </Head>
    <tbody>
      {sortMovements(movements, sort).map(movement => (
        <IncomingMovementRow
          key={movement.id}
          movement={movement}
          now={now}
          selected={movement.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </tbody>
  </table>
)
