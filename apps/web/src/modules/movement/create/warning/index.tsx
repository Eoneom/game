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
}

export const MovementCreateWarning: React.FC<Props> = ({
  isTemporaryOutpost,
  troops,
  selectedTroops,
  destinationCapacityExceeded = false,
}) => {
  const warnings: React.ReactNode[] = []

  if (destinationCapacityExceeded) {
    warnings.push(
      <p key="capacity" className="movement-warning" role="status">
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
        <p key="temporary" className="movement-warning" role="status">
          Attention : ce déplacement va supprimer l&apos;avant-poste temporaire.
        </p>
      )
    }
  }

  if (!warnings.length) {
    return null
  }

  return <>{warnings}</>
}
