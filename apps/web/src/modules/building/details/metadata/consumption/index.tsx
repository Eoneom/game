import React from 'react'

import { transformDecimals } from '#helpers/transform'

interface Props {
  currentConsumption: number
  nextConsumption: number
}

export const BuildingDetailsMetadataConsumption: React.FC<Props> = ({
  currentConsumption,
  nextConsumption
}) => {
  return <>
    <p>
      Consommation actuelle: <strong>{transformDecimals(currentConsumption)}</strong><br />
      Consommation suivante: <strong>{transformDecimals(nextConsumption)}</strong>
    </p>
  </>
}
