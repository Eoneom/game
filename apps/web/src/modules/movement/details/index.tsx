import React from 'react'
import { Link } from '@tanstack/react-router'
import { MovementAction, MovementKind } from '@eoneom/api-client'

import { LayoutDetailsContent } from '#ui/layout/details/content'
import { EntityThumb } from '#ui/entity-thumb'
import { formatTime } from '#helpers/transform'
import { useNow } from '#hook/now'
import { CombatStrategyLabels, MovementActionLabels } from '#movement/translations'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { Movement } from '#types'
import { CargoIcons } from '#movement/cargo-icons'
import { formatArrivalClock, secondsUntil } from '#movement/clock'
import { cellDistance, formatCellDistance, formatUnitCount, totalUnits } from '#movement/format'
import { formatLocationLabel, useLocationDirectory } from '#movement/location-label'

const AnyLink = Link as React.ComponentType<{
  to: string
  search?: Record<string, number>
  className?: string
  children: React.ReactNode
}>

interface Props {
  movement: Movement
  /** `…/world/map` of the current location, for « Voir sur la carte ». */
  mapPath?: string
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Title of a movement: the action, « Retour » for trips home, the convoy leg for exchange convoys. */
const movementTitle = (movement: Movement): string => {
  if (movement.kind === MovementKind.CONVOY) {
    return movement.action === MovementAction.EXCHANGE
      ? 'Convoi de bourse — Livraison'
      : 'Retour des transporteurs'
  }
  if (movement.kind === MovementKind.RETURN) return 'Retour'
  return MovementActionLabels[movement.action]
}

/**
 * Own movement in the details panel (slice 045): route, timing, troops, cargo, strategy. Also mounted by the map
 * drawer of slice 044.
 */
export const MovementDetails: React.FC<Props> = ({ movement, mapPath }) => {
  const now = useNow()
  const directory = useLocationDirectory()
  const remaining = secondsUntil(movement.arrive_at, now)
  const started = new Date(movement.arrive_at)

  const status = movement.battle_id
    ? `En bataille depuis ${pad(started.getHours())}:${pad(started.getMinutes())}`
    : movement.kind === MovementKind.RETURN || (movement.kind === MovementKind.CONVOY && movement.action !== MovementAction.EXCHANGE)
      ? 'Retour en cours'
      : 'En route'

  return (
    <LayoutDetailsContent>
      <h2>{movementTitle(movement)}</h2>
      <p className={movement.battle_id ? 'text-danger' : 'text-amber'}>{status}</p>

      <div className="details-block space-y-1">
        <p className="details-meta">
          {formatLocationLabel(movement.origin, directory)}
          <span aria-hidden> → </span>
          <span className="sr-only"> vers </span>
          {formatLocationLabel(movement.destination, directory)}
        </p>
        <p className="details-meta">Distance : {formatCellDistance(cellDistance(movement.origin, movement.destination))}</p>
        {!movement.battle_id && (
          <p className="details-meta">
            Arrivée dans{' '}
            <span className="font-mono tabular-nums text-amber">{remaining > 0 ? formatTime(remaining) : 'Arrivée…'}</span>
          </p>
        )}
        {Number.isFinite(movement.departure_at) && (
          <p className="details-meta">
            Départ :{' '}
            <time className="tabular-nums" dateTime={new Date(movement.departure_at).toISOString()}>
              {pad(new Date(movement.departure_at).getHours())}:{pad(new Date(movement.departure_at).getMinutes())}
            </time>
          </p>
        )}
        <p className="details-meta">
          {movement.battle_id ? 'Début de la bataille' : 'Arrivée prévue'} :{' '}
          <time className="tabular-nums" dateTime={started.toISOString()}>
            {started.toLocaleDateString('fr-FR')} {formatArrivalClock(movement.arrive_at, movement.arrive_at)}
          </time>
        </p>
        {movement.combat_strategy && (
          <p className="details-meta">Stratégie : {CombatStrategyLabels[movement.combat_strategy]}</p>
        )}
      </div>

      <h3>Troupes · {formatUnitCount(totalUnits(movement.troops))}</h3>
      <ul className="!list-none !pl-0 space-y-1">
        {movement.troops.map(troop => {
          const { name } = TroopTranslations[troop.code]
          return (
            <li key={troop.code} className="flex items-center gap-2">
              <EntityThumb src={troopImageSrc(troop.code)} alt="" size="sm" />
              <span className="flex-1">{name}</span>
              <span className="font-mono tabular-nums text-amber">{troop.count}</span>
            </li>
          )
        })}
      </ul>

      <h3>Cargaison</h3>
      <p><CargoIcons resources={movement.resources} /></p>

      {movement.kind === MovementKind.CONVOY && (
        <p className="details-meta">
          Convoi de la bourse de faction : il ne peut être ni modifié ni intercepté.
        </p>
      )}

      {mapPath && (
        <AnyLink
          to={mapPath}
          search={{ x: movement.destination.x, y: movement.destination.y }}
          className="inline-block rounded-sm border border-rust/50 px-3 py-1.5 text-meta uppercase tracking-wide text-amber-dim hover:border-rust hover:text-amber"
        >
          Voir sur la carte
        </AnyLink>
      )}
    </LayoutDetailsContent>
  )
}
