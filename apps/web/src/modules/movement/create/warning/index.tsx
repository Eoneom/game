import { TroopCode } from '@eoneom/api-client'
import React from 'react'

interface Props {
  isTemporaryOutpost: boolean
  troops: {
    code: TroopCode
    count: number
  }[]
  selectedTroops: Partial<Record<TroopCode, number>>
  destinationCapacityExceeded?: boolean
  /** Every movement slot of the empire is in use (slice 028). */
  movementLimitReached?: boolean
}

export const MovementCreateWarning: React.FC<Props> = ({
  isTemporaryOutpost,
  troops,
  selectedTroops,
  destinationCapacityExceeded = false,
  movementLimitReached = false,
}) => {
  const warnings: React.ReactNode[] = []

  if (movementLimitReached) {
    warnings.push(
      <p key="movement-limit" className="m-0 text-body font-semibold text-danger" role="status">
        Limite de mouvements simultanés atteinte : attendez le retour d&apos;un mouvement ou améliorez un centre de commandement.
      </p>
    )
  }

  if (destinationCapacityExceeded) {
    warnings.push(
      <p key="capacity" className="m-0 text-body font-semibold text-danger" role="status">
        Attention : les ressources dépassent la capacité de stockage de la destination. L&apos;excédent sera renvoyé.
      </p>
    )
  }

  if (isTemporaryOutpost) {
    const isAllTroopsTaken = troops.every(troop => {
      return troop.count === (selectedTroops[troop.code] ?? 0)
    })

    if (isAllTroopsTaken) {
      warnings.push(
        <p key="temporary" className="m-0 text-body font-semibold text-danger" role="status">
          Attention : ce déplacement va supprimer l&apos;avant-poste temporaire.
        </p>
      )
    }
  }

  if (!warnings.length) {
    return null
  }

  return <div className="space-y-2 rounded-sm border border-danger/50 bg-danger-deep/25 p-2">{warnings}</div>
}
