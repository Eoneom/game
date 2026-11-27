import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MapPage } from '#map/page'
import { MapSearch, validateMapSearch } from '#map/search'

const OutpostMapRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <MapPage
      origin={{ kind: 'outpost', id: outpostId }}
      search={search}
      onSearchChange={patch => navigate({ search: (previous: MapSearch) => ({ ...previous, ...patch }), replace: true })}
    />
  )
}

/** Same search params as the city map (slice 044). */
export const Route = createFileRoute('/outpost/$outpostId/world/map')({
  validateSearch: (search: Record<string, unknown>): MapSearch => validateMapSearch(search),
  component: OutpostMapRoute,
})
