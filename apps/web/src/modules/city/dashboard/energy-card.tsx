import React from 'react'

import { useGetCity } from '#city/hooks'
import { getEnergyUsagePercent } from '#helpers/energy'
import { transformDecimals } from '#helpers/transform'
import { EnergyReadout } from '#ui/energy-readout'
import { DashboardCard, queryCardState } from '#location/dashboard/card'

/** « Énergie » (slice 042): consumption against production (bar mode of `EnergyReadout`) and the margin. */
export const EnergyCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useGetCity(cityId)
  const city = query.data?.id === cityId ? query.data : undefined
  const margin = city ? city.energy - city.energy_consumption : 0

  return (
    <DashboardCard
      title="Énergie"
      to="/city/$cityId/base/building"
      params={{ cityId }}
      state={queryCardState({ data: city, isError: query.isError })}
      onRetry={() => void query.refetch()}
    >
      {city ? (
        <div className="space-y-2">
          <EnergyReadout consumption={city.energy_consumption} production={city.energy} lede="" />
          <p className="m-0 flex justify-between gap-2 text-meta">
            {margin >= 0 ? (
              <span className="text-terminal">Réserve <span className="font-mono tabular-nums">+{transformDecimals(margin)}</span></span>
            ) : (
              <span className="text-danger">Déficit <span className="font-mono tabular-nums">−{transformDecimals(-margin)}</span></span>
            )}
            <span className="font-mono tabular-nums text-label">
              {Math.round(getEnergyUsagePercent(city.energy_consumption, city.energy))} %
            </span>
          </p>
        </div>
      ) : null}
    </DashboardCard>
  )
}
