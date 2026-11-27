import React from 'react'

import { formatCoordinates } from '#helpers/transform'
import { useGetCity } from '#city/hooks'
import { DASHBOARD_GRID_CLASS } from '#location/dashboard/card'
import { IncomingAlert } from '#location/dashboard/incoming-alert'
import { LocationMovementsCard } from '#location/dashboard/movements-card'
import { CityProductionCard } from '#location/dashboard/production-card'
import { BuildingQueueCard } from '#city/dashboard/building-card'
import { DefenseCapacityCard } from '#city/dashboard/defense-card'
import { EnergyCard } from '#city/dashboard/energy-card'
import { ExchangeOrdersCard } from '#city/dashboard/exchange-card'
import { FortificationQueueCard } from '#city/dashboard/fortification-card'
import { RecruitmentQueueCard } from '#city/dashboard/recruitment-card'
import { ResearchQueueCard } from '#city/dashboard/research-card'

/**
 * City home `/city/$cityId/base/` (slice 042): one card per concern, each with its own query, loading and error
 * state, and a link to its full page. Fixed order; the alert row only shows when an attack targets this city.
 */
export const CityDashboard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const { data } = useGetCity(cityId)
  const city = data?.id === cityId ? data : undefined
  const location = { kind: 'city' as const, id: cityId }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rust/50 pb-3">
        {city ? (
          <>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="m-0 text-page text-amber">{city.name}</h1>
              <span className="font-mono text-meta text-label">{formatCoordinates(city.coordinates)}</span>
            </div>
            <p className="m-0 text-meta text-label">
              Niveaux de bâtiments{' '}
              <span className="font-mono tabular-nums text-amber">{city.building_levels_used} / {city.maximum_building_levels}</span>
            </p>
          </>
        ) : (
          <div aria-busy="true" className="flex w-full items-center gap-3">
            <span className="sr-only">Chargement de la ville</span>
            <div className="h-6 w-48 rounded-sm bg-chrome-3 animate-pulse motion-reduce:animate-none" />
            <div className="h-4 w-16 rounded-sm bg-chrome-3 animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </header>

      <div className={DASHBOARD_GRID_CLASS}>
        <IncomingAlert location={location} />
        <CityProductionCard cityId={cityId} />
        <EnergyCard cityId={cityId} />
        <BuildingQueueCard cityId={cityId} />
        <ResearchQueueCard cityId={cityId} />
        <RecruitmentQueueCard cityId={cityId} />
        <FortificationQueueCard cityId={cityId} />
        <DefenseCapacityCard cityId={cityId} />
        <ExchangeOrdersCard cityId={cityId} />
        <LocationMovementsCard origin={location} coordinates={city?.coordinates} />
      </div>
    </section>
  )
}
