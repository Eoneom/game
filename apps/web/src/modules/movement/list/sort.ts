import { MovementAction, MovementKind } from '@eoneom/api-client'

import { pickSearchValue } from '#helpers/search'
import { MovementActionLabels } from '#movement/translations'

/** Movements page tabs and sorting (slice 045), kept in the URL (`tab`, `sort`). */
export const MOVEMENT_TABS = [ 'sortants', 'entrants', 'retours', 'convois' ] as const
export type MovementTab = typeof MOVEMENT_TABS[number]
export type OwnMovementTab = Exclude<MovementTab, 'entrants'>

export const MOVEMENT_SORTS = [ 'arrival', '-arrival', 'action' ] as const
export type MovementSort = typeof MOVEMENT_SORTS[number]

export const DEFAULT_MOVEMENT_TAB: MovementTab = 'sortants'
export const DEFAULT_MOVEMENT_SORT: MovementSort = 'arrival'

export const MovementTabLabels: Record<MovementTab, string> = {
  sortants: 'Sortants',
  entrants: 'Entrants',
  retours: 'Retours',
  convois: 'Convois',
}

const TAB_KIND: Record<OwnMovementTab, MovementKind> = {
  sortants: MovementKind.OUTGOING,
  retours: MovementKind.RETURN,
  convois: MovementKind.CONVOY,
}

/** Own movements of a tab, by the server-provided `kind`. */
export const movementsOfTab = <T extends { kind: MovementKind }>(movements: readonly T[], tab: OwnMovementTab): T[] =>
  movements.filter(movement => movement.kind === TAB_KIND[tab])

/** Label a row sorts on with `action`: returns all read « Retour », incoming rows are attacks. */
export const rowOrderLabel = (row: { action?: MovementAction; kind?: MovementKind }): string => {
  if (row.kind === MovementKind.RETURN) return 'Retour'
  if (row.kind === MovementKind.CONVOY) return row.action === MovementAction.EXCHANGE ? 'Livraison' : 'Retour des transporteurs'
  return row.action ? MovementActionLabels[row.action] : MovementActionLabels[MovementAction.ATTACK]
}

/** Soonest first (`arrival`), latest first (`-arrival`), or order label then soonest (`action`). Stable on ties. */
export const sortMovements = <T extends { arrive_at: number; action?: MovementAction; kind?: MovementKind }>(
  rows: readonly T[],
  sort: MovementSort
): T[] => {
  const byArrival = (a: T, b: T) => a.arrive_at - b.arrive_at
  return [ ...rows ].sort((a, b) => {
    if (sort === '-arrival') return b.arrive_at - a.arrive_at
    if (sort === 'action') {
      return rowOrderLabel(a).localeCompare(rowOrderLabel(b), 'fr') || byArrival(a, b)
    }
    return byArrival(a, b)
  })
}

/** List route search params (`validateSearch`): invalid values are dropped. */
export interface MovementListSearch {
  tab?: MovementTab
  sort?: MovementSort
  /** Incoming attack shown in the details panel. */
  incoming?: string
}

export const validateMovementListSearch = (raw: Record<string, unknown>): MovementListSearch => ({
  tab: pickSearchValue(MOVEMENT_TABS, raw.tab),
  sort: pickSearchValue(MOVEMENT_SORTS, raw.sort),
  incoming: typeof raw.incoming === 'string' && raw.incoming !== '' ? raw.incoming : undefined,
})
