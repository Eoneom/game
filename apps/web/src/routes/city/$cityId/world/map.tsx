import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MapPage } from '#map/page'
import { MapSearch, validateMapSearch } from '#map/search'

const MapRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <MapPage
      origin={{ kind: 'city', id: cityId }}
      search={search}
      onSearchChange={patch => navigate({ search: (previous: MapSearch) => ({ ...previous, ...patch }), replace: true })}
    />
  )
}

/** `?x=&y=&zoom=&layers=` (slice 044); alliance links pass `x` / `y` (slice 033). */
export const Route = createFileRoute('/city/$cityId/world/map')({
  validateSearch: (search: Record<string, unknown>): MapSearch => validateMapSearch(search),
  component: MapRoute,
})
