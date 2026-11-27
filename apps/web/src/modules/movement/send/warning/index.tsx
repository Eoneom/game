import { TroopCode } from '@eoneom/api-client'
import React from 'react'
import classNames from 'classnames'

interface Props {
  isTemporaryOutpost: boolean
  troops: {
    code: TroopCode
    count: number
  }[]
  selectedTroops: Partial<Record<TroopCode, number>>
  destinationCapacityExceeded?: boolean
  /** Every movement slot of the empire is in use (slice 028). Blocks the send. */
  movementLimitReached?: boolean
  /** « Baser » on an empty cell while every outpost slot is used: the troops come back (slice 011). */
  outpostLimitReached?: boolean
  /** « Espionner »: failed scouts are lost (slice 030). */
  spy?: boolean
  /** Transport with water to an own outpost, which stores none (slice 035). */
  waterToOutpost?: boolean
}

interface Warning {
  key: string
  text: string
  blocking: boolean
}

/** Summary warnings of the send wizard (slice 045); only the movement cap blocks the send. */
export const MovementCreateWarning: React.FC<Props> = ({
  isTemporaryOutpost,
  troops,
  selectedTroops,
  destinationCapacityExceeded = false,
  movementLimitReached = false,
  outpostLimitReached = false,
  spy = false,
  waterToOutpost = false,
}) => {
  const warnings: Warning[] = []

  if (movementLimitReached) {
    warnings.push({
      key: 'movement-limit',
      text: 'Limite de mouvements simultanés atteinte : attendez le retour d\'un mouvement ou améliorez un centre de commandement.',
      blocking: true,
    })
  }

  if (destinationCapacityExceeded) {
    warnings.push({
      key: 'capacity',
      text: 'Attention : les ressources dépassent la capacité de stockage de la destination. L\'excédent sera renvoyé.',
      blocking: false,
    })
  }

  if (isTemporaryOutpost && troops.length > 0 && troops.every(troop => troop.count === (selectedTroops[troop.code] ?? 0))) {
    warnings.push({
      key: 'temporary',
      text: 'Attention : ce déplacement va supprimer l\'avant-poste temporaire.',
      blocking: false,
    })
  }

  if (outpostLimitReached) {
    warnings.push({
      key: 'outpost-limit',
      text: 'Limite d\'avant-postes atteinte : vos troupes reviendront à leur point de départ.',
      blocking: false,
    })
  }

  if (spy) {
    warnings.push({
      key: 'spy',
      text: 'En cas d\'échec, tous les éclaireurs envoyés sont détruits et la cible est prévenue.',
      blocking: false,
    })
  }

  if (waterToOutpost) {
    warnings.push({
      key: 'water',
      text: 'L\'eau ne peut pas être stockée dans un avant-poste : elle reviendra avec les transporteurs.',
      blocking: false,
    })
  }

  if (!warnings.length) {
    return null
  }

  return (
    <div className="space-y-2">
      {warnings.map(warning => (
        <p
          key={warning.key}
          role="status"
          data-blocking={warning.blocking || undefined}
          className={classNames(
            'm-0 rounded-sm border px-2 py-1.5 text-body',
            warning.blocking
              ? 'border-danger/50 bg-danger-deep/25 font-semibold text-danger'
              : 'border-amber/40 text-amber'
          )}
        >
          {warning.text}
        </p>
      ))}
    </div>
  )
}
