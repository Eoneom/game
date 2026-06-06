import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MapPage } from '#map/page'

const MapRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <MapPage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/world/map')({
  component: MapRoute,
})
