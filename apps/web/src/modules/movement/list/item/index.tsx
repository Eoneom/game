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
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm uppercase tracking-wide text-amber">{actionLabel}</span>
        <span className="font-mono text-sm text-terminal">{formatTime(remainingTime)}</span>
      </span>
      <span className="mt-1 flex items-center gap-2 font-mono text-xs text-amber-dim">
        <span title="Départ">{formatCoordinates(movement.origin)}</span>
        <span aria-hidden>→</span>
        <span title="Arrivée">{formatCoordinates(movement.destination)}</span>
      </span>
      {(movement.resources.plastic > 0 || movement.resources.mushroom > 0) && (
        <span className="mt-1 block text-xs text-label">
          {movement.resources.plastic} plastique · {movement.resources.mushroom} champignon
        </span>
      )}
    </>
  )

  const linkClass =
    'block rounded-sm border border-rust/50 bg-chrome/70 px-3 py-2 transition hover:border-amber/50 hover:text-amber'

  return (
    <li>
      {cityId ? (
        <RouterLink
          className={linkClass}
          to="/city/$cityId/world/movement/$movementId"
          params={{ cityId, movementId: movement.id }}
        >
          {movementRouteContent}
        </RouterLink>
      ) : outpostId ? (
        <RouterLink
          className={linkClass}
          to="/outpost/$outpostId/world/movement/$movementId"
          params={{ outpostId, movementId: movement.id }}
        >
          {movementRouteContent}
        </RouterLink>
      ) : (
        <span className={linkClass}>{movementRouteContent}</span>
      )}
    </li>
  )
}
