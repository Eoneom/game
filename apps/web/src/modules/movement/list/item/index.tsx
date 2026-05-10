import React from 'react'
import { Link } from '@tanstack/react-router'

import { formatCoordinates, formatTime } from '#helpers/transform'
import { useTimer } from '#hook/timer'
import { MovementActionLabels } from '#movement/translations'
import { MovementItem } from '#types'
import { useLocation } from '#location/context'

interface Props {
  movement: MovementItem
}

export const MovementListItem: React.FC<Props> = ({ movement }) => {
  const { cityId, outpostId } = useLocation()
  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    className?: string
    children: React.ReactNode
  }>

  const { remainingTime } = useTimer({
    onDone: () => undefined,
    doneAt: movement.arrive_at
  })

  const actionLabel = MovementActionLabels[movement.action]
  const movementRouteContent = (
    <>
      <span className="movement-active-item__row movement-active-item__row--top">
        <span className="movement-active-item__action">{actionLabel}</span>
        <span className="movement-active-item__timer">{formatTime(remainingTime)}</span>
      </span>
      <span className="movement-active-item__route">
        <span className="movement-active-item__coord" title="Départ">
          {formatCoordinates(movement.origin)}
        </span>
        <span className="movement-active-item__arrow" aria-hidden>
          →
        </span>
        <span className="movement-active-item__coord" title="Arrivée">
          {formatCoordinates(movement.destination)}
        </span>
      </span>
      {(movement.resources.plastic > 0 || movement.resources.mushroom > 0) && (
        <span className="movement-active-item__cargo">
          {movement.resources.plastic} plastique · {movement.resources.mushroom} champignon
        </span>
      )}
    </>
  )

  return (
    <li>
      {cityId ? (
        <RouterLink
          className="movement-active-item__link"
          to="/city/$cityId/movement/$movementId"
          params={{ cityId, movementId: movement.id }}
        >
          {movementRouteContent}
        </RouterLink>
      ) : outpostId ? (
        <RouterLink
          className="movement-active-item__link"
          to="/outpost/$outpostId/movement/$movementId"
          params={{ outpostId, movementId: movement.id }}
        >
          {movementRouteContent}
        </RouterLink>
      ) : (
        <span className="movement-active-item__link">{movementRouteContent}</span>
      )}
    </li>
  )
}
