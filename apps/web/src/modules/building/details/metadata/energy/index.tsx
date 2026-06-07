import React from 'react'

import { transformDecimals } from '#helpers/transform'

interface Props {
  currentEnergy: number
  nextEnergy: number
}

export const BuildingDetailsMetadataEnergy: React.FC<Props> = ({ currentEnergy, nextEnergy }) => {
  return <>
    <p>
      Énergie actuelle: <strong>{transformDecimals(currentEnergy)}</strong><br />
      Énergie suivante: <strong>{transformDecimals(nextEnergy)}</strong>
    </p>
  </>
}
