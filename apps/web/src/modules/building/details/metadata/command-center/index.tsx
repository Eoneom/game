import React from 'react'

interface Props {
  currentMovementBonus: number
  nextMovementBonus: number
  movementLimit: number
  recruitQueueLimit: number
}

export const BuildingDetailsMetadataCommandCenter: React.FC<Props> = ({
  currentMovementBonus,
  nextMovementBonus,
  movementLimit,
  recruitQueueLimit
}) => {
  return <>
    <p>
      Mouvements de cette ville : <strong>+{currentMovementBonus}</strong><br />
      Au niveau suivant : <strong>+{nextMovementBonus}</strong><br />
      Mouvements simultanés de l'empire : <strong>{movementLimit}</strong>
    </p>
    {recruitQueueLimit > 0 && <p>
      File de recrutement : <strong>{recruitQueueLimit}</strong>
    </p>}
  </>
}
