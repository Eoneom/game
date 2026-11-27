import React, { useEffect, useMemo, useRef } from 'react'
import classNames from 'classnames'
import { Coordinates, MovementAction, TechnologyCode } from '@eoneom/api-client'

import { formatCoordinates, formatDurationMmSs } from '#helpers/transform'
import { useNow } from '#hook/now'
import { secondsUntil } from '#movement/clock'
import { MovementCapacityReadout } from '#movement/capacity'
import { MovementOrigin, movementListPath, movementSendPath } from '#movement/navigation'
import { MovementActionLabels } from '#movement/translations'
import { useListTechnologies } from '#technology/hooks'
import { troopKeys, useListIncomingMovements, useListMovements, useMovementCapacity } from '#troop/hooks'
import { DashboardCard, DashboardEmpty, DashboardLink, queryCardState } from '#location/dashboard/card'
import { LocationMovementGroup, classifyLocationMovements } from '#location/dashboard/movements'
import { useCountdownRefetch } from '#location/dashboard/refetch'

const MAX_ROWS = 5

interface Row {
  id: string
  label: string
  danger: boolean
  origin: Coordinates | null
  destination: Coordinates
  arrive_at: number
  battle: boolean
}

const groupLabel = (group: LocationMovementGroup, action: MovementAction): string => {
  if (group === 'returning') return 'Retour'
  if (group === 'convoy') return MovementActionLabels[MovementAction.EXCHANGE]
  return MovementActionLabels[action]
}

const Counter: React.FC<{ label: string, children: React.ReactNode, danger?: boolean }> = ({ label, children, danger }) => (
  <span className="text-meta text-label">
    {label}{' '}
    <span className={classNames('font-mono tabular-nums', danger ? 'text-danger' : 'text-amber')}>{children}</span>
  </span>
)

interface Props {
  origin: MovementOrigin
  /** Location cell; the card stays in its loading state until it is known. */
  coordinates: Coordinates | undefined
}

/**
 * « Mouvements » (slice 042): counters for this location, the movement cap and the next 5 arrivals, incoming attacks
 * included. Classification by the server's `kind` (slice 045).
 */
export const LocationMovementsCard: React.FC<Props> = ({ origin, coordinates }) => {
  const movementsQuery = useListMovements()
  const { data: capacity } = useMovementCapacity()
  const { data: incomings = [] } = useListIncomingMovements()
  const { data: technologies } = useListTechnologies(origin.kind === 'city' ? { cityId: origin.id } : {})
  const now = useNow(1000)
  const refetch = useCountdownRefetch(troopKeys.movements)
  const handled = useRef(new Set<string>())

  const detection = technologies?.technologies.find(technology => technology.code === TechnologyCode.DETECTION)?.level
  const isOutpost = origin.kind === 'outpost'

  const { counts, rows } = useMemo(() => {
    if (!coordinates || !movementsQuery.data) {
      return { counts: { outgoing: 0, returning: 0, convoys: 0, incoming: 0 }, rows: [] as Row[] }
    }
    const classified = classifyLocationMovements({ movements: movementsQuery.data, coordinates })
    const incoming_here = incomings.filter(movement => movement.target.kind === origin.kind && movement.target.id === origin.id)
    const all: Row[] = [
      ...classified.rows.map(({ movement, group }) => ({
        id: movement.id,
        label: groupLabel(group, movement.action),
        danger: false,
        origin: movement.origin,
        destination: movement.destination,
        arrive_at: movement.arrive_at,
        battle: Boolean(movement.battle_id),
      })),
      ...incoming_here.map(movement => ({
        id: movement.id,
        label: 'Attaque entrante',
        danger: true,
        origin: null,
        destination: movement.target.coordinates,
        arrive_at: movement.arrive_at,
        battle: false,
      })),
    ].sort((a, b) => a.arrive_at - b.arrive_at)
    return {
      counts: {
        outgoing: classified.outgoing.length,
        returning: classified.returning.length,
        convoys: classified.convoys.length,
        incoming: incoming_here.length,
      },
      rows: all,
    }
  }, [ coordinates, movementsQuery.data, incomings, origin.kind, origin.id ])

  // Fallback refresh when an arrival passes without a WebSocket event (once per row).
  const due = rows
    .filter(row => !row.battle && row.arrive_at <= now && !handled.current.has(row.id))
    .map(row => row.id)
    .join(',')
  useEffect(() => {
    if (!due) return
    due.split(',').forEach(id => handled.current.add(id))
    refetch()
  }, [ due, refetch ])

  const state = coordinates ? queryCardState(movementsQuery) : 'loading'
  const listPath = movementListPath(origin)
  const visible = rows.slice(0, MAX_ROWS)
  const more = rows.length - visible.length

  return (
    <DashboardCard
      title="Mouvements"
      to={listPath}
      state={state}
      onRetry={() => void movementsQuery.refetch()}
      className="col-span-full"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 flex flex-wrap gap-x-2 gap-y-1">
          <Counter label="Sortants">{counts.outgoing}</Counter>
          <span aria-hidden className="text-label">·</span>
          <Counter label="Retours">{counts.returning}</Counter>
          <span aria-hidden className="text-label">·</span>
          <Counter label="Convois">{counts.convoys}</Counter>
          <span aria-hidden className="text-label">·</span>
          {detection === 0 ? (
            <span className="text-meta text-label">Entrants <span className="text-amber-dim">Détection requise</span></span>
          ) : (
            <Counter label="Entrants" danger={counts.incoming > 0}>{counts.incoming}</Counter>
          )}
        </p>
        {capacity ? <MovementCapacityReadout used={capacity.used} limit={capacity.limit} /> : null}
      </div>

      {rows.length === 0 ? (
        <DashboardEmpty cta={{ label: 'Envoyer des troupes', to: movementSendPath(origin) }}>
          Aucun mouvement en cours depuis ou vers {isOutpost ? 'cet avant-poste' : 'cette ville'}.
        </DashboardEmpty>
      ) : (
        <>
          <table className="w-full border-collapse text-left text-meta">
            <thead>
              <tr className="text-caption uppercase tracking-wider text-label">
                <th scope="col" className="px-2 py-1 font-medium">Type</th>
                <th scope="col" className="px-2 py-1 font-medium">Trajet</th>
                <th scope="col" className="px-2 py-1 text-right font-medium">Arrivée</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const remaining = secondsUntil(row.arrive_at, now)
                return (
                  <tr key={row.id} className="h-8 border-t border-rust/30 text-amber-dim">
                    <td className={classNames('px-2 py-1 text-body', row.danger && 'text-danger')}>{row.label}</td>
                    <td className="px-2 py-1 font-mono tabular-nums">
                      <span title={row.origin ? undefined : 'Origine inconnue'}>
                        {row.origin ? formatCoordinates(row.origin) : '?'}
                      </span>
                      {' → '}
                      {formatCoordinates(row.destination)}
                    </td>
                    <td className={classNames('px-2 py-1 text-right font-mono tabular-nums', row.danger ? 'text-danger' : 'text-amber')}>
                      {row.battle ? 'En bataille' : remaining > 0 ? formatDurationMmSs(remaining) : 'Arrivée…'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {more > 0 ? (
            <p className="m-0 mt-2 text-meta">
              <DashboardLink to={listPath} className="text-amber">+{more} autre{more > 1 ? 's' : ''}</DashboardLink>
            </p>
          ) : null}
        </>
      )}
    </DashboardCard>
  )
}
