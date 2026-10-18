import React from 'react'

import { formatCoordinates } from '#helpers/transform'
import type { AdminSystemPlayerOngoingMovement } from '@eoneom/api-client'
import { MovementAction, TroopCode } from '@eoneom/api-client'
import { useCountdownProgress } from '#hook/countdown-progress'
import { MovementActionLabels } from '#movement/translations'

import { RESOURCE_LABEL, translateTroopCode } from './labels'

export function hasMovementCargo(resources: AdminSystemPlayerOngoingMovement['resources']): boolean {
  return resources.plastic > 0 || resources.mushroom > 0 || resources.plasma > 0
}

export const OngoingMovementItem: React.FC<{
  movement: AdminSystemPlayerOngoingMovement
}> = ({ movement }) => {
  const { remainingSeconds } = useCountdownProgress({
    endAt: movement.arrive_at,
    onDone: () => undefined,
  })

  const action_label = MovementActionLabels[movement.action as MovementAction]
  const show_cargo = movement.action === MovementAction.TRANSPORT && hasMovementCargo(movement.resources)

  return (
    <li className="admin-surface-nested min-w-0 rounded-sm p-2 text-sm text-amber">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{action_label}</span>
        <span className="text-xs text-amber-dim">
          Arrivée dans {remainingSeconds} s
        </span>
      </div>
      <p className="m-0 mt-1 font-mono text-xs text-amber-dim">
        {formatCoordinates(movement.origin)}
        <span aria-hidden className="mx-1">→</span>
        {formatCoordinates(movement.destination)}
      </p>
      {movement.troops.length > 0 && (
        <ul className="m-0 mt-1 list-none space-y-0.5 p-0 text-xs">
          {movement.troops.map(troop => (
            <li key={troop.code}>
              {translateTroopCode(troop.code as TroopCode)}
              <span className="text-amber-dim"> — ×{troop.count}</span>
            </li>
          ))}
        </ul>
      )}
      {show_cargo && (
        <p className="m-0 mt-1 text-xs text-amber-dim">
          Cargaison :{' '}
          {movement.resources.plastic > 0 && `${movement.resources.plastic} ${RESOURCE_LABEL.plastic.toLowerCase()}`}
          {movement.resources.plastic > 0 && movement.resources.mushroom > 0 && ' · '}
          {movement.resources.mushroom > 0 && `${movement.resources.mushroom} ${RESOURCE_LABEL.mushroom.toLowerCase()}`}
          {(movement.resources.plastic > 0 || movement.resources.mushroom > 0) && movement.resources.plasma > 0 && ' · '}
          {movement.resources.plasma > 0 && `${movement.resources.plasma} ${RESOURCE_LABEL.plasma.toLowerCase()}`}
        </p>
      )}
    </li>
  )
}
