import React from 'react'

interface Props {
  openOrderCount: number
  currentOpenOrderLimit: number
  nextOpenOrderLimit: number
}

/** Faction exchange (slice 035): open orders of this city against the trading post level. */
export const BuildingDetailsMetadataTradingPost: React.FC<Props> = ({
  openOrderCount,
  currentOpenOrderLimit,
  nextOpenOrderLimit
}) => {
  return <p>
    Ordres ouverts dans cette ville : <strong>{openOrderCount} / {currentOpenOrderLimit}</strong><br />
    Au niveau suivant : <strong>{nextOpenOrderLimit}</strong> ordres
  </p>
}
